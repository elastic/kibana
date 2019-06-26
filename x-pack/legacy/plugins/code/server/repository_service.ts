/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Git, { RemoteCallbacks } from '@elastic/nodegit';
import del from 'del';
import fs from 'fs';
import mkdirp from 'mkdirp';
import moment from 'moment';
import path from 'path';

import { RepositoryUtils } from '../common/repository_utils';
import {
  CloneProgress,
  CloneWorkerResult,
  DeleteWorkerResult,
  Repository,
  UpdateWorkerResult,
} from '../model';
import { Logger } from './log';

// Return false to stop the clone progress. Return true to keep going;
export type CloneProgressHandler = (progress: number, cloneProgress?: CloneProgress) => boolean;
export type UpdateProgressHandler = () => boolean;

const GIT_FETCH_PROGRESS_CANCEL = -1;
// TODO: Cannot directly access Git.Error.CODE.EUSER (-7). Investigate why.
const NODEGIT_CALLBACK_RETURN_VALUE_ERROR = -7;
const GIT_INDEXER_PROGRESS_CALLBACK_RETURN_VALUE_ERROR_MSG = `indexer progress callback returned ${GIT_FETCH_PROGRESS_CANCEL}`;
const SSH_AUTH_ERROR = new Error('Failed to authenticate SSH session');

function isCancelled(error: any) {
  return (
    error &&
    (error.message.includes(GIT_INDEXER_PROGRESS_CALLBACK_RETURN_VALUE_ERROR_MSG) ||
      error.errno === NODEGIT_CALLBACK_RETURN_VALUE_ERROR)
  );
}

// This is the service for any kind of repository handling, e.g. clone, update, delete, etc.
export class RepositoryService {
  constructor(
    private readonly repoVolPath: string,
    private readonly credsPath: string,
    private readonly log: Logger,
    private readonly enableGitCertCheck: boolean
  ) {}

  public async clone(repo: Repository, handler?: CloneProgressHandler): Promise<CloneWorkerResult> {
    if (!repo) {
      throw new Error(`Invalid repository.`);
    } else {
      const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, repo.uri);
      if (fs.existsSync(localPath)) {
        this.log.info(`Repository exist in local path. Do update instead of clone.`);
        try {
          // Do update instead of clone if the local repo exists.
          const updateRes = await this.update(repo);
          return {
            uri: repo.uri,
            repo: {
              ...repo,
              defaultBranch: updateRes.branch,
              revision: updateRes.revision,
            },
          };
        } catch (error) {
          // If failed to update the current git repo living in the disk, clean up the local git repo and
          // move on with the clone.
          await this.remove(repo.uri);
        }
      } else {
        const parentDir = path.dirname(localPath);
        // on windows, git clone will failed if parent folder is not exists;
        await new Promise((resolve, reject) =>
          mkdirp(parentDir, err => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          })
        );
      }
      // Go head with the actual clone.
      if (repo.protocol === 'ssh') {
        return this.tryWithKeys(key => this.doClone(repo, localPath, handler, key));
      } else {
        return await this.doClone(repo, localPath, handler);
      }
    }
  }

  public async remove(uri: string): Promise<DeleteWorkerResult> {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    try {
      // For now, just `rm -rf`
      await del([localPath], { force: true });
      this.log.info(`Remove local repository ${uri} done.`);
      return {
        uri,
        res: true,
      };
    } catch (error) {
      this.log.error(`Remove local repository ${uri} error: ${error}.`);
      throw error;
    }
  }
  public async update(
    repo: Repository,
    handler?: UpdateProgressHandler
  ): Promise<UpdateWorkerResult> {
    if (repo.protocol === 'ssh') {
      return await this.tryWithKeys(key => this.doUpdate(repo.uri, key, handler));
    } else {
      return await this.doUpdate(repo.uri, /* key */ undefined, handler);
    }
  }
  public async doUpdate(
    uri: string,
    key?: string,
    handler?: UpdateProgressHandler
  ): Promise<UpdateWorkerResult> {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    let repo: Git.Repository | undefined;
    try {
      repo = await Git.Repository.open(localPath);
      const cbs: RemoteCallbacks = {
        transferProgress: (_: any) => {
          if (handler) {
            const resumeUpdate = handler();
            if (!resumeUpdate) {
              return GIT_FETCH_PROGRESS_CANCEL;
            }
          }
          return 0;
        },
        credentials: this.credentialFunc(key),
      };
      // Ignore cert check on testing environment.
      if (!this.enableGitCertCheck) {
        cbs.certificateCheck = () => {
          // Ignore cert check failures.
          return 0;
        };
      }
      await repo.fetchAll({
        callbacks: cbs,
      });
      // TODO(mengwei): deal with the case when the default branch has changed.
      const currentBranch = await repo.getCurrentBranch();
      const currentBranchName = currentBranch.shorthand();
      const originBranchName = `origin/${currentBranchName}`;
      const originRef = await repo.getReference(originBranchName);
      const headRef = await repo.getReference(currentBranchName);
      if (!originRef.target().equal(headRef.target())) {
        await headRef.setTarget(originRef.target(), 'update');
      }
      const headCommit = await repo.getHeadCommit();
      this.log.debug(`Update repository to revision ${headCommit.sha()}`);
      return {
        uri,
        branch: currentBranchName,
        revision: headCommit.sha(),
      };
    } catch (error) {
      if (isCancelled(error)) {
        // Update job was cancelled intentionally. Do not throw this error.
        this.log.info(`Update repository job for ${uri} was cancelled.`);
        this.log.debug(
          `Update repository job cancellation error: ${JSON.stringify(error, null, 2)}`
        );
        return {
          uri,
          branch: '',
          revision: '',
          cancelled: true,
        };
      } else if (error.message && error.message.startsWith(SSH_AUTH_ERROR.message)) {
        throw SSH_AUTH_ERROR;
      } else {
        const msg = `update repository ${uri} error: ${error}`;
        this.log.error(msg);
        throw new Error(msg);
      }
    } finally {
      if (repo) {
        repo.cleanup();
      }
    }
  }

  /**
   * read credentials dir, try using each privateKey until action is successful
   * @param action
   */
  private async tryWithKeys<R>(action: (key: string) => Promise<R>): Promise<R> {
    const files = fs.existsSync(this.credsPath)
      ? new Set(fs.readdirSync(this.credsPath))
      : new Set([]);
    for (const f of files) {
      if (f.endsWith('.pub')) {
        const privateKey = f.slice(0, f.length - 4);
        if (files.has(privateKey)) {
          try {
            this.log.debug(`try with key ${privateKey}`);
            return await action(privateKey);
          } catch (e) {
            if (e !== SSH_AUTH_ERROR) {
              throw e;
            }
            // continue to try another key
          }
        }
      }
    }
    throw SSH_AUTH_ERROR;
  }

  private async doClone(
    repo: Repository,
    localPath: string,
    handler?: CloneProgressHandler,
    keyFile?: string
  ) {
    try {
      let lastProgressUpdate = moment();
      const cbs: RemoteCallbacks = {
        transferProgress: (stats: any) => {
          // Clone progress update throttling.
          const now = moment();
          if (now.diff(lastProgressUpdate) < 1000) {
            return 0;
          }
          lastProgressUpdate = now;

          if (handler) {
            const progress =
              (100 * (stats.receivedObjects() + stats.indexedObjects())) /
              (stats.totalObjects() * 2);
            const cloneProgress = {
              isCloned: false,
              receivedObjects: stats.receivedObjects(),
              indexedObjects: stats.indexedObjects(),
              totalObjects: stats.totalObjects(),
              localObjects: stats.localObjects(),
              totalDeltas: stats.totalDeltas(),
              indexedDeltas: stats.indexedDeltas(),
              receivedBytes: stats.receivedBytes(),
            };
            const resumeClone = handler(progress, cloneProgress);
            if (!resumeClone) {
              return GIT_FETCH_PROGRESS_CANCEL;
            }
          }
          return 0;
        },
        credentials: this.credentialFunc(keyFile),
      };
      // Ignore cert check on testing environment.
      if (!this.enableGitCertCheck) {
        cbs.certificateCheck = () => {
          // Ignore cert check failures.
          return 0;
        };
      }
      let gitRepo: Git.Repository | undefined;

      try {
        gitRepo = await Git.Clone.clone(repo.url, localPath, {
          bare: 1,
          fetchOpts: {
            callbacks: cbs,
          },
        });
        const headCommit = await gitRepo.getHeadCommit();
        const headRevision = headCommit.sha();
        const currentBranch = await gitRepo.getCurrentBranch();
        const currentBranchName = currentBranch.shorthand();
        this.log.info(
          `Clone repository from ${
            repo.url
          } done with head revision ${headRevision} and default branch ${currentBranchName}`
        );
        return {
          uri: repo.uri,
          repo: {
            ...repo,
            defaultBranch: currentBranchName,
            revision: headRevision,
          },
        };
      } finally {
        if (gitRepo) {
          gitRepo.cleanup();
        }
      }
    } catch (error) {
      if (isCancelled(error)) {
        // Clone job was cancelled intentionally. Do not throw this error.
        this.log.info(`Clone repository job for ${repo.uri} was cancelled.`);
        this.log.debug(
          `Clone repository job cancellation error: ${JSON.stringify(error, null, 2)}`
        );
        return {
          uri: repo.uri,
          repo,
          cancelled: true,
        };
      } else if (error.message && error.message.startsWith(SSH_AUTH_ERROR.message)) {
        throw SSH_AUTH_ERROR;
      } else {
        const msg = `Clone repository from ${repo.url} error.`;
        this.log.error(msg);
        this.log.error(error);
        throw new Error(error.message);
      }
    }
  }

  private credentialFunc(keyFile: string | undefined) {
    return (url: string, userName: string) => {
      if (keyFile) {
        this.log.debug(`try with key ${path.join(this.credsPath, keyFile)}`);
        return Git.Cred.sshKeyNew(
          userName,
          path.join(this.credsPath, `${keyFile}.pub`),
          path.join(this.credsPath, keyFile),
          ''
        );
      } else {
        return Git.Cred.defaultNew();
      }
    };
  }
}
