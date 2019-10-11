/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import { FileItem, LsTreeSummary, simplegit, SimpleGit } from '@elastic/simple-git/dist';
import Boom from 'boom';
import * as Path from 'path';
import * as fs from 'fs';
import { isBinaryFileSync } from 'isbinaryfile';
import { BlameSummary, DiffResultTextFile } from '@elastic/simple-git/dist/response';
import moment from 'moment';
import { GitBlame } from '../common/git_blame';
import { CommitDiff, Diff, DiffKind } from '../common/git_diff';
import { FileTree, FileTreeItemType, RepositoryUri } from '../model';
import { CommitInfo, ReferenceInfo, ReferenceType } from '../model/commit';
import { detectLanguage } from './utils/detect_language';
import { FormatParser } from './utils/format_parser';

export const HEAD = 'HEAD';
export const DEFAULT_TREE_CHILDREN_LIMIT = 50;

export interface Blob {
  isBinary(): boolean;
  content(): Buffer;
  rawsize(): number;
}

function entry2Tree(entry: FileItem, prefixPath: string = ''): FileTree {
  const type: FileTreeItemType = GitOperations.mode2type(entry.mode);
  const { path, id } = entry;
  return {
    name: path,
    path: prefixPath ? prefixPath + '/' + path : path,
    sha1: id,
    type,
  };
}

interface Tree {
  entries: FileItem[];
  oid: string;
}
export class GitOperations {
  private repoRoot: string;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;
  }

  public async fileContent(uri: RepositoryUri, path: string, revision: string = 'master') {
    const git = await this.openGit(uri);
    const commit: CommitInfo = await this.getCommitOr404(uri, revision);
    const p = `${commit.id}:${path}`;

    const type = await git.catFile(['-t', p]);
    if (type.trim() === 'blob') {
      const buffer: Buffer = await git.binaryCatFile(['blob', p]);
      return {
        content(): Buffer {
          return buffer;
        },
        rawsize(): number {
          return buffer.length;
        },
        isBinary(): boolean {
          return isBinaryFileSync(buffer);
        },
      } as Blob;
    } else {
      throw Boom.unsupportedMediaType(`${uri}/${path} is not a file.`);
    }
  }

  public async getDefaultBranch(uri: RepositoryUri): Promise<string> {
    const git = await this.openGit(uri);
    return (await git.raw(['symbolic-ref', HEAD, '--short'])).trim();
  }

  public async getHeadRevision(uri: RepositoryUri): Promise<string> {
    return await this.getRevision(uri, HEAD);
  }

  public async getRevision(uri: RepositoryUri, ref: string): Promise<string> {
    const git = await this.openGit(uri);
    return await git.revparse([ref]);
  }

  public async blame(uri: RepositoryUri, revision: string, path: string): Promise<GitBlame[]> {
    const git = await this.openGit(uri);
    const blameSummary: BlameSummary = await git.blame(revision, path);
    const results: GitBlame[] = [];
    for (const blame of blameSummary.blames) {
      results.push({
        committer: {
          name: blame.commit.author!.name,
          email: blame.commit.author!.email,
        },
        startLine: blame.resultLine,
        lines: blame.lines,
        commit: {
          id: blame.commit.id!,
          message: blame.commit.message!,
          date: moment
            .unix(blame.commit.author!.time)
            .utcOffset(blame.commit.author!.tz)
            .toISOString(true),
        },
      });
    }
    return results;
  }

  public async openGit(uri: RepositoryUri, check: boolean = true): Promise<SimpleGit> {
    const repoDir = this.repoDir(uri);
    const git = simplegit(repoDir);
    if (!check) return git;
    if (await git.checkIsRepo()) {
      return git;
    } else {
      throw Boom.notFound(`repo ${uri} not found`);
    }
  }

  private repoDir(uri: RepositoryUri) {
    const repoDir = Path.join(this.repoRoot, uri);
    this.checkPath(repoDir);
    return repoDir;
  }

  private checkPath(path: string) {
    if (!fs.realpathSync(path).startsWith(fs.realpathSync(this.repoRoot))) {
      throw new Error('invalid path');
    }
  }

  public async countRepoFiles(uri: RepositoryUri, revision: string): Promise<number> {
    const git = await this.openGit(uri);
    const ls = new LsTreeSummary(git, revision, '.', { recursive: true });
    return (await ls.allFiles()).length;
  }

  public async *iterateRepo(uri: RepositoryUri, revision: string) {
    const git = await this.openGit(uri);
    const ls = new LsTreeSummary(git, revision, '.', { showSize: true, recursive: true });
    for await (const file of ls.iterator()) {
      const type = GitOperations.mode2type(file.mode);
      if (type === FileTreeItemType.File) {
        yield file;
      }
    }
  }

  public async readTree(git: SimpleGit, oid: string, path: string = '.'): Promise<Tree> {
    const lsTree = new LsTreeSummary(git, oid, path, {});
    const entries = await lsTree.allFiles();
    return {
      entries,
      oid,
    } as Tree;
  }

  public static mode2type(mode: string): FileTreeItemType {
    switch (mode) {
      case '100755':
      case '100644':
        return FileTreeItemType.File;
      case '120000':
        return FileTreeItemType.Link;
      case '40000':
      case '040000':
        return FileTreeItemType.Directory;
      case '160000':
        return FileTreeItemType.Submodule;
      default:
        throw new Error('unknown mode: ' + mode);
    }
  }

  /**
   * Return a fileTree structure by walking the repo file tree.
   * @param uri the repo uri
   * @param path the start path
   * @param revision the revision
   * @param skip pagination parameter, skip how many nodes in each children.
   * @param limit pagination parameter, limit the number of node's children.
   * @param resolveParents whether the return value should always start from root
   * @param flatten
   */
  public async fileTree(
    uri: RepositoryUri,
    path: string,
    revision: string = HEAD,
    skip: number = 0,
    limit: number = DEFAULT_TREE_CHILDREN_LIMIT,
    resolveParents: boolean = false,
    flatten: boolean = false
  ): Promise<FileTree> {
    const commit = await this.getCommitOr404(uri, revision);
    const git = await this.openGit(uri);
    if (path.startsWith('/')) {
      path = path.slice(1);
    }
    if (path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    function type2item(type: string) {
      switch (type) {
        case 'blob':
          return FileTreeItemType.File;
        case 'tree':
          return FileTreeItemType.Directory;
        case 'commit':
          return FileTreeItemType.Submodule;
        default:
          throw new Error(`unsupported file tree item type ${type}`);
      }
    }

    if (resolveParents) {
      const root: FileTree = {
        name: '',
        path: '',
        type: FileTreeItemType.Directory,
      };
      const tree = await this.readTree(git, commit.treeId);
      await this.fillChildren(git, root, tree, { skip, limit, flatten });
      if (path) {
        await this.resolvePath(git, root, tree, path.split('/'), { skip, limit, flatten });
      }
      return root;
    } else {
      if (path) {
        const file = (await this.readTree(git, commit.id, path)).entries[0];
        const result: FileTree = {
          name: path.split('/').pop() || '',
          path,
          type: type2item(file.type!),
          sha1: file.id,
        };
        if (file.type === 'tree') {
          await this.fillChildren(git, result, await this.readTree(git, file.id), {
            skip,
            limit,
            flatten,
          });
        }
        return result;
      } else {
        const root: FileTree = {
          name: '',
          path: '',
          type: FileTreeItemType.Directory,
        };
        const tree = await this.readTree(git, commit.id, '.');
        await this.fillChildren(git, root, tree, { skip, limit, flatten });
        return root;
      }
    }
  }

  private async fillChildren(
    git: SimpleGit,
    result: FileTree,
    { entries }: Tree,
    { skip, limit, flatten }: { skip: number; limit: number; flatten: boolean }
  ) {
    result.childrenCount = entries.length;
    result.children = [];
    for (const e of entries.slice(skip, Math.min(entries.length, skip + limit))) {
      const child = entry2Tree(e, result.path);
      result.children.push(child);
      if (flatten && child.type === FileTreeItemType.Directory) {
        const tree = await this.readTree(git, e.id);
        if (tree.entries.length === 1) {
          await this.fillChildren(git, child, tree, { skip, limit, flatten });
        }
      }
    }
  }

  private async resolvePath(
    git: SimpleGit,
    result: FileTree,
    tree: Tree,
    paths: string[],
    opt: { skip: number; limit: number; flatten: boolean }
  ) {
    const [path, ...rest] = paths;
    for (const entry of tree.entries) {
      if (entry.path === path) {
        if (!result.children) {
          result.children = [];
        }
        const child = entry2Tree(entry, result.path);
        const idx = result.children.findIndex(i => i.sha1 === entry.id);
        if (idx < 0) {
          result.children.push(child);
        } else {
          result.children[idx] = child;
        }
        if (entry.type === 'tree') {
          const subTree = await this.readTree(git, entry.id);
          await this.fillChildren(git, child, subTree, opt);
          if (rest.length > 0) {
            await this.resolvePath(git, child, subTree, rest, opt);
          }
        }
      }
    }
  }

  public async getCommitDiff(uri: string, revision: string): Promise<CommitDiff> {
    const git = await this.openGit(uri);
    const commit = await this.getCommitOr404(uri, revision);
    const diffs = await git.diffSummary([revision]);

    const commitDiff: CommitDiff = {
      commit,
      additions: diffs.insertions,
      deletions: diffs.deletions,
      files: [],
    };
    for (const d of diffs.files) {
      if (!d.binary) {
        const diff = d as DiffResultTextFile;
        const kind = this.diffKind(diff);
        switch (kind) {
          case DiffKind.ADDED:
            {
              const path = diff.file;
              const modifiedCode = await this.getModifiedCode(git, commit, path);
              const language = await detectLanguage(path, modifiedCode);
              commitDiff.files.push({
                language,
                path,
                modifiedCode,
                additions: diff.insertions,
                deletions: diff.deletions,
                kind,
              });
            }
            break;
          case DiffKind.DELETED:
            {
              const path = diff.file;
              const originCode = await this.getOriginCode(git, commit, path);
              const language = await detectLanguage(path, originCode);
              commitDiff.files.push({
                language,
                path,
                originCode,
                kind,
                additions: diff.insertions,
                deletions: diff.deletions,
              });
            }
            break;
          case DiffKind.MODIFIED:
            {
              const path = diff.rename || diff.file;
              const modifiedCode = await this.getModifiedCode(git, commit, path);
              const originPath = diff.file;
              const originCode = await this.getOriginCode(git, commit, originPath);
              const language = await detectLanguage(path, modifiedCode);
              commitDiff.files.push({
                language,
                path,
                originPath,
                originCode,
                modifiedCode,
                kind,
                additions: diff.insertions,
                deletions: diff.deletions,
              });
            }
            break;
          case DiffKind.RENAMED:
            {
              const path = diff.rename || diff.file;
              commitDiff.files.push({
                path,
                originPath: diff.file,
                kind,
                additions: diff.insertions,
                deletions: diff.deletions,
              });
            }
            break;
        }
      }
    }
    return commitDiff;
  }

  public async getDiff(uri: string, oldRevision: string, newRevision: string): Promise<Diff> {
    const git = await this.openGit(uri);
    const diff = await git.diffSummary([oldRevision, newRevision]);
    const res: Diff = {
      additions: diff.insertions,
      deletions: diff.deletions,
      files: [],
    };
    diff.files.forEach(d => {
      if (!d.binary) {
        const td = d as DiffResultTextFile;
        const kind = this.diffKind(td);
        res.files.push({
          path: d.file,
          additions: td.insertions,
          deletions: td.deletions,
          kind,
        });
      }
    });

    return res;
  }

  private diffKind(diff: DiffResultTextFile) {
    let kind: DiffKind = DiffKind.MODIFIED;
    if (diff.changes === diff.insertions) {
      kind = DiffKind.ADDED;
    } else if (diff.changes === diff.deletions) {
      kind = DiffKind.DELETED;
    } else if (diff.rename) {
      kind = DiffKind.RENAMED;
    }
    return kind;
  }

  private async getOriginCode(git: SimpleGit, commit: CommitInfo, path: string) {
    const buffer: Buffer = await git.binaryCatFile(['blob', `${commit.id}~1:${path}`]);
    return buffer.toString('utf8');
  }

  private async getModifiedCode(git: SimpleGit, commit: CommitInfo, path: string) {
    const buffer: Buffer = await git.binaryCatFile(['blob', `${commit.id}:${path}`]);
    return buffer.toString('utf8');
  }

  public async getBranchAndTags(repoUri: string): Promise<ReferenceInfo[]> {
    const format = {
      name: '%(refname:short)',
      reference: '%(refname)',
      type: '%(objecttype)',
      commit: {
        updated: '%(*authordate)',
        message: '%(*contents)',
        committer: '%(*committername)',
        author: '%(*authorname)',
        id: '%(*objectname)',
        parents: '%(*parent)',
        treeId: '%(*tree)',
      },
    };
    const parser = new FormatParser(format);
    const git = await this.openGit(repoUri);
    const result = await git.raw([
      'for-each-ref',
      '--format=' + parser.toFormatStr(),
      'refs/tags/*',
      'refs/remotes/origin/*',
    ]);
    const results = parser.parseResult(result);
    return results.map(r => {
      const ref: ReferenceInfo = {
        name: r.name.startsWith('origin/') ? r.name.slice(7) : r.name,
        reference: r.reference,
        type: r.type === 'tag' ? ReferenceType.TAG : ReferenceType.REMOTE_BRANCH,
      };
      if (r.commit && r.commit.id) {
        const commit = {
          ...r.commit,
        };
        commit.parents = r.commit.parents ? r.commit.parents.split(' ') : [];
        commit.updated = new Date(r.commit.updated);
        ref.commit = commit;
      }
      return ref;
    });
  }

  public async getCommitOr404(repoUri: string, ref: string): Promise<CommitInfo> {
    const commit = await this.getCommitInfo(repoUri, ref);
    if (!commit) {
      throw Boom.notFound(`repo ${repoUri} or ${ref} not found`);
    }
    return commit;
  }

  public async log(
    repoUri: string,
    revision: string,
    count: number,
    path?: string
  ): Promise<CommitInfo[]> {
    const git = await this.openGit(repoUri);
    const options: any = {
      n: count,
      format: {
        updated: '%ai',
        message: '%B',
        author: '%an',
        authorEmail: '%ae',
        committer: '%cn',
        committerEmail: '%ce',
        id: '%H',
        parents: '%p',
        treeId: '%T',
      },
      from: revision,
    };
    if (path) {
      options.file = path;
    }
    const result = await git.log(options);
    return (result.all as unknown) as CommitInfo[];
  }

  public async resolveRef(repoUri: string, ref: string): Promise<string | null> {
    const git = await this.openGit(repoUri);
    let oid = '';

    try {
      // try local branches or tags
      oid = (await git.revparse(['-q', '--verify', ref])).trim();
    } catch (e) {
      // try remote branches
    }
    if (!oid) {
      try {
        oid = (await git.revparse(['-q', '--verify', `origin/${ref}`])).trim();
      } catch (e1) {
        // no match
      }
    }
    return oid || null;
  }

  public async getCommitInfo(repoUri: string, ref: string): Promise<CommitInfo | null> {
    const oid = await this.resolveRef(repoUri, ref);
    if (oid) {
      const commits = await this.log(repoUri, oid, 1);
      if (commits.length > 0) {
        return commits[0];
      }
    }
    return null;
  }
}
