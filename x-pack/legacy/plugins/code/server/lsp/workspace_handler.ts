/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import del from 'del';
import fs from 'fs';
import { delay } from 'lodash';
import path from 'path';
import crypto from 'crypto';
import { ResponseMessage } from 'vscode-jsonrpc/lib/messages';
import { Hover, Location, TextDocumentPositionParams } from 'vscode-languageserver';

import { DetailSymbolInformation, Full } from '@elastic/lsp-extension';

import { SimpleGit } from '@elastic/simple-git/dist/promise';
import { simplegit } from '@elastic/simple-git/dist';
import { RepositoryUtils } from '../../common/repository_utils';
import { parseLspUrl } from '../../common/uri_util';
import { FileTreeItemType, LspRequest, WorkerReservedProgress } from '../../model';
import { GitOperations, HEAD } from '../git_operations';
import { EsClient } from '../lib/esqueue';
import { Logger } from '../log';
import { RepositoryObjectClient } from '../search';
import { LoggerFactory } from '../utils/log_factory';

interface Worktree {
  path: string;
  revision: string;
  branch: string;
}

export const MAX_RESULT_COUNT = 20;

export class WorkspaceHandler {
  private revisionMap: { [uri: string]: string } = {};
  private log: Logger;
  private readonly objectClient: RepositoryObjectClient | undefined = undefined;

  constructor(
    public readonly gitOps: GitOperations,
    private readonly workspacePath: string,
    private readonly client: EsClient,
    loggerFactory: LoggerFactory
  ) {
    // this.git = new GitOperations(repoPath);
    this.log = loggerFactory.getLogger(['LSP', 'workspace']);
    if (this.client) {
      this.objectClient = new RepositoryObjectClient(this.client);
    }
  }

  /**
   * open workspace for repositoryUri, update it from bare repository if necessary.
   * @param repositoryUri the uri of bare repository.
   * @param ref
   */
  public async openWorkspace(repositoryUri: string, ref: string) {
    // Try get repository clone status with 3 retries at maximum.
    const tryGetGitStatus = async (retryCount: number) => {
      let gitStatus;
      try {
        gitStatus = await this.objectClient!.getRepositoryGitStatus(repositoryUri);
      } catch (error) {
        throw Boom.internal(`checkout workspace on an unknown status repository`);
      }

      if (
        !RepositoryUtils.hasFullyCloned(gitStatus.cloneProgress) &&
        gitStatus.progress < WorkerReservedProgress.COMPLETED
      ) {
        if (retryCount < 3) {
          this.log.debug(`Check repository ${repositoryUri} clone status at trial ${retryCount}`);
          return delay(tryGetGitStatus, 3000, retryCount + 1);
        } else {
          throw Boom.internal(`repository has not been fully cloned yet.`);
        }
      }
    };
    if (this.objectClient) {
      await tryGetGitStatus(0);
    }
    const git = await this.gitOps.openGit(repositoryUri);
    const defaultBranch = await this.gitOps.getDefaultBranch(repositoryUri);
    const targetRevision = await this.gitOps.getRevision(repositoryUri, ref);
    if (ref !== defaultBranch) {
      await this.checkCommit(git, targetRevision);
      ref = defaultBranch;
    }
    const workspaceBranch = this.workspaceWorktreeBranchName(ref);
    const worktrees = await this.listWorktrees(git);
    let wt: Worktree;
    if (worktrees.has(workspaceBranch)) {
      wt = worktrees.get(workspaceBranch)!;
    } else {
      wt = await this.openWorktree(
        git,
        workspaceBranch,
        await this.revisionDir(repositoryUri, ref, this.randomPath()),
        targetRevision
      );
    }
    if (!targetRevision.startsWith(wt.revision)) {
      await this.setWorkspaceRevision(wt.path, targetRevision);
    }
    return {
      workspaceDir: wt.path,
      workspaceRevision: targetRevision,
    };
  }

  private randomPath() {
    return crypto.randomBytes(4).toString('hex');
  }

  public async openWorktree(
    git: SimpleGit,
    workspaceBranch: string,
    dir: string,
    revision: string
  ) {
    await git.raw(['worktree', 'add', '-b', workspaceBranch, dir, revision]);
    return {
      revision,
      path: dir,
      branch: workspaceBranch,
    } as Worktree;
  }

  public async listWorkspaceFolders(repoUri: string) {
    const git = await this.gitOps.openGit(repoUri);
    const worktrees = await this.listWorktrees(git);
    const isDir = (source: string) => fs.lstatSync(source).isDirectory();
    return [...worktrees.values()]
      .filter(wt => wt.branch.startsWith('workspace'))
      .map(wt => wt.path)
      .filter(isDir);
  }

  public async listWorktrees(git: SimpleGit): Promise<Map<string, Worktree>> {
    const str = await git.raw(['worktree', 'list']);
    const regex = /(.*?)\s+([a-h0-9]+)\s+\[(.+)\]/gm;
    let m;
    const result: Map<string, Worktree> = new Map();
    while ((m = regex.exec(str)) !== null) {
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      const [, p, revision, branch] = m;
      result.set(branch, {
        path: p,
        revision,
        branch,
      });
    }
    return result;
  }

  public async clearWorkspace(repoUri: string) {
    const git = await this.gitOps.openGit(repoUri);
    const worktrees = await this.listWorktrees(git);
    for (const wt of worktrees.values()) {
      await git.raw(['worktree', 'remove', wt.path, '--force']);
      await git.deleteLocalBranch(wt.branch);
    }
    const workspaceDir = await this.workspaceDir(repoUri);
    await del([workspaceDir], { force: true });
  }

  public async handleRequest(request: LspRequest): Promise<void> {
    const { method, params } = request;
    switch (method) {
      case 'textDocument/edefinition':
      case 'textDocument/definition':
      case 'textDocument/hover':
      case 'textDocument/references':
      case 'textDocument/documentSymbol':
      case 'textDocument/full': {
        const payload: TextDocumentPositionParams = params;
        const { filePath, workspacePath, workspaceRevision } = await this.resolveUri(
          params.textDocument.uri
        );
        if (filePath) {
          request.documentUri = payload.textDocument.uri;
          payload.textDocument.uri = request.resolvedFilePath = filePath;
          request.workspacePath = workspacePath!;
          request.workspaceRevision = workspaceRevision!;
        }
        break;
      }
      default:
      // do nothing
    }
  }

  public handleResponse(request: LspRequest, response: ResponseMessage): ResponseMessage {
    if (!response.result) {
      return response;
    }
    const { method } = request;
    switch (method) {
      case 'textDocument/hover': {
        const result = response.result as Hover;
        this.handleHoverContents(result);
        return response;
      }
      case 'textDocument/edefinition': {
        let result = response.result;
        if (result) {
          if (!Array.isArray(result)) {
            response.result = result = [result];
          }
          for (const def of result) {
            this.convertLocation(def.location);
          }
        }
        return response;
      }
      case 'textDocument/definition': {
        const result = response.result;
        if (result) {
          if (Array.isArray(result)) {
            (result as Location[]).forEach(location => this.convertLocation(location));
          } else {
            this.convertLocation(result);
          }
        }
        return response;
      }
      case 'textDocument/full': {
        // unify the result of full as a array.
        const result = Array.isArray(response.result)
          ? (response.result as Full[])
          : [response.result as Full];
        for (const full of result) {
          if (full.symbols) {
            for (const symbol of full.symbols) {
              this.convertLocation(symbol.symbolInformation.location);

              if (symbol.contents !== null || symbol.contents !== undefined) {
                this.handleHoverContents(symbol);
              }
            }
          }
          if (full.references) {
            for (const reference of full.references) {
              this.convertLocation(reference.location);
              if (reference.target.location) {
                this.convertLocation(reference.target.location);
              }
            }
          }
        }
        response.result = result;
        return response;
      }
      case 'textDocument/references': {
        if (response.result) {
          const locations = (response.result as Location[]).slice(0, MAX_RESULT_COUNT);
          for (const location of locations) {
            this.convertLocation(location);
          }
          response.result = locations;
        }
        return response;
      }
      case 'textDocument/documentSymbol': {
        if (response.result) {
          for (const symbol of response.result) {
            this.convertLocation(symbol.location);
          }
        }
        return response;
      }
      default:
        return response;
    }
  }

  private handleHoverContents(result: Hover | DetailSymbolInformation) {
    if (!Array.isArray(result.contents)) {
      if (typeof result.contents === 'string') {
        result.contents = [{ language: '', value: result.contents }];
      } else {
        result.contents = [result.contents as { language: string; value: string }];
      }
    } else {
      result.contents = Array.from(result.contents).map(c => {
        if (typeof c === 'string') {
          return { language: '', value: c };
        } else {
          return c;
        }
      });
    }
  }

  private parseLocation(location: Location) {
    const uri = location.uri;
    const prefix = path.sep === '\\' ? 'file:///' : 'file://';
    if (uri && uri.startsWith(prefix)) {
      const locationPath = fs.realpathSync(decodeURIComponent(uri.substring(prefix.length)));
      const workspacePath = fs.realpathSync(decodeURIComponent(this.workspacePath));
      // On windows, it's possible one path has c:\ and another has C:\, so we need compare case-insensitive
      if (locationPath.toLocaleLowerCase().startsWith(workspacePath.toLocaleLowerCase())) {
        let relativePath = locationPath.substring(workspacePath.length + 1);
        if (path.sep === '\\') {
          relativePath = relativePath.replace(/\\/gi, '/');
        }
        const regex = /^(.*?\/.*?\/.*?)\/(__.*?\/)?([^_]+?)\/(.*)$/;
        const m = relativePath.match(regex);
        if (m) {
          const repoUri = m[1];
          const revision = m[3];
          const gitRevision = this.revisionMap[`${repoUri}/${revision}`] || revision;
          const file = m[4];
          return { repoUri, revision: gitRevision, file };
        }
      }
      // @ts-ignore
      throw new Error("path in response doesn't not starts with workspace path");
    }
    return null;
  }

  private convertLocation(location: Location) {
    if (location) {
      const parsedLocation = this.parseLocation(location);
      if (parsedLocation) {
        const { repoUri, revision, file } = parsedLocation;
        location.uri = `git://${repoUri}/blob/${revision}/${file}`;
      }
      return parsedLocation;
    }
  }

  private fileUrl(str: string) {
    let pathName = str.replace(/\\/g, '/');
    // Windows drive letter must be prefixed with a slash
    if (pathName[0] !== '/') {
      pathName = '/' + pathName;
    }
    return 'file://' + pathName;
  }

  /**
   * convert a git uri to absolute file path, checkout code into workspace
   * @param uri the uri
   */
  private async resolveUri(uri: string) {
    if (uri.startsWith('git://')) {
      const { repoUri, file, revision } = parseLspUrl(uri)!;
      const { workspaceDir, workspaceRevision } = await this.openWorkspace(repoUri, revision);
      if (file) {
        const isValidPath = await this.checkFile(repoUri, revision, file);
        if (!isValidPath) {
          throw new Error('invalid file path in requests.');
        }
      }
      return {
        workspacePath: workspaceDir,
        filePath: this.fileUrl(path.resolve(workspaceDir, file || '/')),
        uri,
        workspaceRevision,
      };
    } else {
      return {
        workspacePath: undefined,
        workspaceRevision: undefined,
        filePath: undefined,
        uri,
      };
    }
  }

  private async checkCommit(git: SimpleGit, targetRevision: string) {
    // we only support headCommit now.
    const headRevision = await git.revparse([HEAD]);
    if (headRevision !== targetRevision) {
      throw Boom.badRequest(`revision must be master.`);
    }
  }

  public async revisionDir(repositoryUri: string, ref: string, randomStr: string = '') {
    return path.join(await this.workspaceDir(repositoryUri, randomStr), ref);
  }

  private async workspaceDir(repoUri: string, randomStr: string = '') {
    const base = path.join(this.workspacePath, repoUri);
    if (randomStr === '') {
      const git = await this.gitOps.openGit(repoUri);
      const trees = await this.listWorktrees(git);
      if (trees.size > 0) {
        const wt = trees.values().next().value;
        return path.dirname(wt.path);
      }
    }
    if (randomStr) {
      return path.join(base, `__${randomStr}`);
    } else {
      return base;
    }
  }

  private workspaceWorktreeBranchName(branch: string): string {
    return `workspace-${branch}`;
  }

  private async setWorkspaceRevision(workspaceDir: string, revision: string) {
    const git = simplegit(workspaceDir);
    await git.reset(['--hard', revision]);
  }

  /**
   * check whether the file path specify in the request is valid. The file path must:
   *  1. exists in git repo
   *  2. is a valid file or dir, can't be a link or submodule
   *
   * @param repoUri
   * @param revision
   * @param filePath
   */
  private async checkFile(repoUri: string, revision: string, filePath: string) {
    try {
      const git = await this.gitOps.openGit(repoUri);
      const p = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
      const tree = await this.gitOps.readTree(git, revision, p);
      if (tree.entries.length !== 1) {
        return false;
      }
      const entry = tree.entries[0];
      const type = GitOperations.mode2type(entry.mode);
      return type === FileTreeItemType.File || type === FileTreeItemType.Directory;
    } catch (e) {
      // filePath may not exists
      return false;
    }
  }
}
