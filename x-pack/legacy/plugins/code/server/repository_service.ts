/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Progress } from '@elastic/simple-git/dist';
import del from 'del';
import fs from 'fs';
import { promisify } from 'util';
import moment from 'moment';
import path from 'path';

import { SimpleGit } from '@elastic/simple-git/dist/promise';
import { RepositoryUtils } from '../common/repository_utils';
import { CloneProgress, CloneWorkerResult, DeleteWorkerResult, Repository } from '../model';
import { Logger } from './log';
import { GitOperations } from './git_operations';

// Return false to stop the clone progress. Return true to keep going;
export type CloneProgressHandler = (
  progress: number,
  cloneProgress?: CloneProgress
) => Promise<boolean>;
export type UpdateProgressHandler = () => Promise<boolean>;

const GIT_FETCH_PROGRESS_CANCEL = -1;
// TODO: Cannot directly access Git.Error.CODE.EUSER (-7). Investigate why.
const NODEGIT_CALLBACK_RETURN_VALUE_ERROR = -7;
const GIT_INDEXER_PROGRESS_CALLBACK_RETURN_VALUE_ERROR_MSG = `indexer progress callback returned ${GIT_FETCH_PROGRESS_CANCEL}`;
const SSH_AUTH_ERROR = new Error('Failed to authenticate SSH session');

const mkdirAsync = promisify(fs.mkdir);

function isCancelled(error: any) {
  return (
    error &&
    (error.message.includes(GIT_INDEXER_PROGRESS_CALLBACK_RETURN_VALUE_ERROR_MSG) ||
      error.errno === NODEGIT_CALLBACK_RETURN_VALUE_ERROR)
  );
}

// This is the service for any kind of repository handling, e.g. clone, update, delete, etc.
export class RepositoryService {
  private readonly gitOps: GitOperations;
  constructor(
    private readonly repoVolPath: string,
    private readonly credsPath: string,
    private readonly log: Logger
  ) {
    this.gitOps = new GitOperations(repoVolPath);
  }

  public async clone(repo: Repository, handler?: CloneProgressHandler): Promise<CloneWorkerResult> {
    if (!repo) {
      throw new Error(`Invalid repository.`);
    } else {
      const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, repo.uri);
      if (fs.existsSync(localPath)) {
        this.log.info(`Repository exist in local path. Do update instead of clone.`);
        try {
          // Do update instead of clone if the local repo exists.
          return await this.update(repo);
        } catch (error) {
          // If failed to update the current git repo living in the disk, clean up the local git repo and
          // move on with the clone.
          await this.remove(repo.uri);
        }
      } else {
        await mkdirAsync(localPath, { recursive: true });
      }
      // Go head with the actual clone.
      const git = await this.gitOps.openGit(repo.uri, false);
      await git.init(true);
      await git.addRemote('origin', repo.url);
      if (repo.protocol === 'ssh') {
        return this.tryWithKeys(git, () => this.doFetch(git, repo, handler));
      } else {
        return await this.doFetch(git, repo, handler);
      }
    }
  }

  public async remove(uri: string): Promise<DeleteWorkerResult> {
    const localPath = RepositoryUtils.repositoryLocalPath(this.repoVolPath, uri);
    try {
      if (localPath.split(path.sep).includes('..')) {
        throw new Error('Repository path should not contain "..".');
      }
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
  public async update(repo: Repository, handler?: UpdateProgressHandler) {
    const git = await this.gitOps.openGit(repo.uri);
    if (repo.protocol === 'ssh') {
      return await this.tryWithKeys(git, () => this.doFetch(git, repo, handler));
    } else {
      return await this.doFetch(git, repo, handler);
    }
  }

  /**
   * read credentials dir, try using each privateKey until action is successful
   * @param git
   * @param action
   */
  private async tryWithKeys<R>(git: SimpleGit, action: () => Promise<R>): Promise<R> {
    const files = fs.existsSync(this.credsPath)
      ? new Set(fs.readdirSync(this.credsPath))
      : new Set([]);
    for (const f of files) {
      if (f.endsWith('.pub')) {
        const privateKey = f.slice(0, f.length - 4);
        if (files.has(privateKey)) {
          try {
            this.log.debug(`try with key ${privateKey}`);
            await git.addConfig(
              'core.sshCommand',
              `ssh -i ${path.join(this.credsPath, privateKey)}`
            );
            return await action();
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

  private PROGRESS_UPDATE_THROTTLING_FREQ_MS = 1000;
  private async doFetch(git: SimpleGit, repo: Repository, handler?: CloneProgressHandler) {
    try {
      let lastProgressUpdate = moment();
      const progressCallback = async (progress: Progress) => {
        const now = moment();
        if (now.diff(lastProgressUpdate) < this.PROGRESS_UPDATE_THROTTLING_FREQ_MS) {
          return 0;
        }
        lastProgressUpdate = now;

        if (handler) {
          const resumeClone = await handler(progress.percentage);
          if (!resumeClone) {
            return GIT_FETCH_PROGRESS_CANCEL;
          }
        }
      };
      await git.fetch(['origin'], undefined, {
        progressCallback,
      });
      const currentBranchName = (await git.raw(['symbolic-ref', 'HEAD', '--short'])).trim();
      const headRevision = await git.revparse([`origin/${currentBranchName}`]);
      // Update master to match origin/master
      await git.raw(['update-ref', `refs/heads/${currentBranchName}`, headRevision]);

      this.log.info(
        `Clone repository from ${repo.url} done with head revision ${headRevision} and default branch ${currentBranchName}`
      );
      return {
        uri: repo.uri,
        repo: {
          ...repo,
          defaultBranch: currentBranchName,
          revision: headRevision,
        },
      };
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
}
