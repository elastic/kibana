/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import {
  Blame,
  Commit as NodeGitCommit,
  Diff as NodeGitDiff,
  Error as NodeGitError,
  Oid,
  Repository,
  Revwalk,
} from '@elastic/nodegit';
import Boom from '@hapi/boom';
import LruCache from 'lru-cache';
import * as Path from 'path';
import * as fs from 'fs';
import { GitBlame } from '../common/git_blame';
import { CommitDiff, Diff, DiffKind } from '../common/git_diff';
import { Commit, FileTree, FileTreeItemType, RepositoryUri } from '../model';
import { CommitInfo, ReferenceInfo, ReferenceType } from '../model/commit';
import { detectLanguage } from './utils/detect_language';
import {
  GitPrime,
  TreeEntry,
  CommitDescription,
  TreeDescription,
  TagDescription,
  GitObjectDescription,
  BlobDescription,
} from './utils/git_prime';

export const HEAD = 'HEAD';
const REFS_HEADS = 'refs/heads/';
export const DEFAULT_TREE_CHILDREN_LIMIT = 50;

/**
 * do a nodegit operation and check the results. If it throws a not found error or returns null,
 * rethrow a Boom.notFound error.
 * @param func the nodegit operation
 * @param message the message pass to Boom.notFound error
 */
async function checkExists<R>(func: () => Promise<R>, message: string): Promise<R> {
  let result: R;
  try {
    result = await func();
  } catch (e) {
    if (e.errno === NodeGitError.CODE.ENOTFOUND) {
      throw Boom.notFound(message);
    } else {
      throw e;
    }
  }
  if (result == null) {
    throw Boom.notFound(message);
  }
  return result;
}

function entry2Tree(entry: TreeEntry, prefixPath: string = ''): FileTree {
  const type: FileTreeItemType = GitOperations.mode2type(entry.mode);
  const { path, oid } = entry;
  return {
    name: path,
    path: prefixPath ? prefixPath + '/' + path : path,
    sha1: oid,
    type,
  };
}

interface Tree {
  entries: TreeEntry[];
  gitdir: string;
  oid: string;
}
export class GitOperations {
  private REPO_LRU_CACHE_SIZE = 16;
  private REPO_MAX_AGE_MS = 60 * 60 * 1000; // 1 hour;
  private repoRoot: string;
  private repoCache: LruCache<RepositoryUri, Repository>;

  constructor(repoRoot: string) {
    this.repoRoot = repoRoot;

    const options = {
      max: this.REPO_LRU_CACHE_SIZE,
      maxAge: this.REPO_MAX_AGE_MS,
      dispose: (repoUri: RepositoryUri, repo: Repository) => {
        // Clean up the repository before disposing this repo out of the cache.
        repo.cleanup();
      },
    };
    this.repoCache = new LruCache(options);
  }

  public cleanRepo(uri: RepositoryUri) {
    if (this.repoCache.has(uri)) {
      this.repoCache.del(uri);
    }
  }

  public async cleanAllRepo() {
    this.repoCache.reset();
  }

  public async fileContent(uri: RepositoryUri, path: string, revision: string = 'master') {
    const gitdir = this.repoDir(uri);
    const commit: CommitInfo = await this.getCommitOr404(uri, revision);
    const file = await GitPrime.readObject({
      gitdir,
      oid: commit.id,
      filepath: path,
      format: 'content',
    });
    if (file && file.type === 'blob') {
      return file.object as BlobDescription;
    }
    throw Boom.unsupportedMediaType(`${uri}/${path} is not a file.`);
  }

  public async getCommit(uri: RepositoryUri, revision: string): Promise<NodeGitCommit> {
    const info = await this.getCommitOr404(uri, revision);
    const repo = await this.openRepo(uri);
    return (await checkExists(
      () => this.findCommit(repo, info.id),
      `revision or branch ${revision} not found in ${uri}`
    )) as NodeGitCommit;
  }

  public async getDefaultBranch(uri: RepositoryUri): Promise<string> {
    const gitdir = this.repoDir(uri);
    const ref = await GitPrime.resolveRef({ gitdir, ref: HEAD, depth: 2 });
    if (ref.startsWith(REFS_HEADS)) {
      return ref.substr(REFS_HEADS.length);
    }
    return ref;
  }

  public async getHeadRevision(uri: RepositoryUri): Promise<string> {
    const gitdir = this.repoDir(uri);
    return await GitPrime.resolveRef({ gitdir, ref: HEAD, depth: 10 });
  }

  public async blame(uri: RepositoryUri, revision: string, path: string): Promise<GitBlame[]> {
    const repo = await this.openRepo(uri);
    const newestCommit = (await this.getCommit(uri, revision)).id();
    const blame = await Blame.file(repo, path, { newestCommit });
    const results: GitBlame[] = [];
    for (let i = 0; i < blame.getHunkCount(); i++) {
      const hunk = blame.getHunkByIndex(i);
      // @ts-ignore wrong definition in nodegit
      const commit = await repo.getCommit(hunk.finalCommitId());
      results.push({
        committer: {
          // @ts-ignore wrong definition in nodegit
          name: hunk.finalSignature().name(),
          // @ts-ignore wrong definition in nodegit
          email: hunk.finalSignature().email(),
        },
        // @ts-ignore wrong definition in nodegit
        startLine: hunk.finalStartLineNumber(),
        // @ts-ignore wrong definition in nodegit
        lines: hunk.linesInHunk(),
        commit: {
          id: commit.sha(),
          message: commit.message(),
          date: commit.date().toISOString(),
        },
      });
    }
    return results;
  }

  public async openRepo(uri: RepositoryUri): Promise<Repository> {
    if (this.repoCache.has(uri)) {
      const repo = this.repoCache.get(uri) as Repository;
      return Promise.resolve(repo);
    }

    const repoDir = this.repoDir(uri);
    const repo = await checkExists<Repository>(
      () => Repository.open(repoDir),
      `repo ${uri} not found`
    );
    this.repoCache.set(uri, repo);
    return Promise.resolve(repo);
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

  private static async isTextFile(gitdir: string, entry: TreeEntry) {
    if (entry.type === 'blob') {
      const type = GitOperations.mode2type(entry.mode);
      if (type === FileTreeItemType.File) {
        return await GitPrime.isTextFile({ gitdir, oid: entry.oid });
      }
    }
    return false;
  }

  public async countRepoFiles(uri: RepositoryUri, revision: string): Promise<number> {
    let count = 0;
    const commit = await this.getCommitOr404(uri, revision);
    const gitdir = this.repoDir(uri);
    const commitObject = await GitPrime.readObject({ gitdir, oid: commit.id });
    const treeId = (commitObject.object as CommitDescription).tree;

    async function walk(oid: string) {
      const tree = await GitOperations.readTree(gitdir, oid);
      for (const entry of tree.entries) {
        if (entry.type === 'tree') {
          await walk(entry.oid);
        } else if (await GitOperations.isTextFile(gitdir, entry)) {
          count++;
        }
      }
    }

    await walk(treeId);
    return count;
  }

  public async iterateRepo(
    uri: RepositoryUri,
    revision: string
  ): Promise<AsyncIterableIterator<FileTree>> {
    const commit = await this.getCommitOr404(uri, revision);
    const gitdir = this.repoDir(uri);
    const commitObject = await GitPrime.readObject({ gitdir, oid: commit.id });
    const treeId = (commitObject.object as CommitDescription).tree;
    async function* walk(oid: string, prefix: string = ''): AsyncIterableIterator<FileTree> {
      const tree = await GitOperations.readTree(gitdir, oid);
      for (const entry of tree.entries) {
        const path = prefix ? `${prefix}/${entry.path}` : entry.path;
        if (entry.type === 'tree') {
          yield* walk(entry.oid, path);
        } else if (await GitOperations.isTextFile(gitdir, entry)) {
          const type = GitOperations.mode2type(entry.mode);
          yield {
            name: entry.path,
            type,
            path,
            repoUri: uri,
            sha1: entry.oid,
          } as FileTree;
        }
      }
    }

    return walk(treeId);
  }

  private static async readTree(gitdir: string, oid: string): Promise<Tree> {
    const { type, object } = await GitPrime.readObject({ gitdir, oid });
    if (type === 'commit') {
      return await this.readTree(gitdir, (object as CommitDescription).tree);
    } else if (type === 'tree') {
      const tree = object as TreeDescription;
      return {
        entries: tree.entries,
        gitdir,
        oid,
      } as Tree;
    } else {
      throw new Error(`${oid} is not a tree`);
    }
  }

  static mode2type(mode: string): FileTreeItemType {
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

  public async iterateCommits(
    uri: RepositoryUri,
    startRevision: string,
    untilRevision?: string
  ): Promise<Commit[]> {
    const repository = await this.openRepo(uri);
    const commit = await this.getCommit(uri, startRevision);

    const revWalk = repository.createRevWalk();
    revWalk.sorting(Revwalk.SORT.TOPOLOGICAL);
    revWalk.push(commit.id());

    const commits: NodeGitCommit[] = await revWalk.getCommitsUntil((c: NodeGitCommit) => {
      // Iterate commits all the way to the oldest one.
      return true;
    });

    const res: Commit[] = commits.map(c => {
      return {
        repoUri: uri,
        id: c.sha(),
        message: c.message(),
        body: c.body(),
        date: c.date(),
        parents: c.parents().map(i => i.tostrS()),
        author: {
          name: c.author().name(),
          email: c.author().email(),
        },
        committer: {
          name: c.committer().name(),
          email: c.committer().email(),
        },
      } as Commit;
    });
    return res;
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
    const gitdir = this.repoDir(uri);
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
      const tree = await GitOperations.readTree(gitdir, commit.treeId);
      await this.fillChildren(root, tree, { skip, limit, flatten });
      if (path) {
        await this.resolvePath(root, tree, path.split('/'), { skip, limit, flatten });
      }
      return root;
    } else {
      const obj = await GitPrime.readObject({ gitdir, oid: commit.id, filepath: path });
      const result: FileTree = {
        name: path.split('/').pop() || '',
        path,
        type: type2item(obj.type!),
        sha1: obj.oid,
      };
      if (result.type === FileTreeItemType.Directory) {
        await this.fillChildren(
          result,
          {
            gitdir,
            entries: (obj.object as TreeDescription).entries,
            oid: obj.oid,
          },
          { skip, limit, flatten }
        );
      }
      return result;
    }
  }

  private async fillChildren(
    result: FileTree,
    { entries, gitdir }: Tree,
    { skip, limit, flatten }: { skip: number; limit: number; flatten: boolean }
  ) {
    result.childrenCount = entries.length;
    result.children = [];
    for (const e of entries.slice(skip, Math.min(entries.length, skip + limit))) {
      const child = entry2Tree(e, result.path);
      result.children.push(child);
      if (flatten && child.type === FileTreeItemType.Directory) {
        const tree = await GitOperations.readTree(gitdir, e.oid);
        if (tree.entries.length === 1) {
          await this.fillChildren(child, tree, { skip, limit, flatten });
        }
      }
    }
  }

  private async resolvePath(
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
        const idx = result.children.findIndex(i => i.sha1 === entry.oid);
        if (idx < 0) {
          result.children.push(child);
        } else {
          result.children[idx] = child;
        }
        if (entry.type === 'tree') {
          const subTree = await GitOperations.readTree(tree.gitdir, entry.oid);
          await this.fillChildren(child, subTree, opt);
          if (rest.length > 0) {
            await this.resolvePath(child, subTree, rest, opt);
          }
        }
      }
    }
  }

  public async getCommitDiff(uri: string, revision: string): Promise<CommitDiff> {
    const repo = await this.openRepo(uri);
    const commit = await this.getCommit(uri, revision);
    const diffs = await commit.getDiff();

    const commitDiff: CommitDiff = {
      commit: commitInfo(commit),
      additions: 0,
      deletions: 0,
      files: [],
    };
    for (const diff of diffs) {
      const patches = await diff.patches();
      for (const patch of patches) {
        const { total_deletions, total_additions } = patch.lineStats();
        commitDiff.additions += total_additions;
        commitDiff.deletions += total_deletions;
        if (patch.isAdded()) {
          const path = patch.newFile().path();
          const modifiedCode = await this.getModifiedCode(commit, path);
          const language = await detectLanguage(path, modifiedCode);
          commitDiff.files.push({
            language,
            path,
            modifiedCode,
            additions: total_additions,
            deletions: total_deletions,
            kind: DiffKind.ADDED,
          });
        } else if (patch.isDeleted()) {
          const path = patch.oldFile().path();
          const originCode = await this.getOriginCode(commit, repo, path);
          const language = await detectLanguage(path, originCode);
          commitDiff.files.push({
            language,
            path,
            originCode,
            kind: DiffKind.DELETED,
            additions: total_additions,
            deletions: total_deletions,
          });
        } else if (patch.isModified()) {
          const path = patch.newFile().path();
          const modifiedCode = await this.getModifiedCode(commit, path);
          const originPath = patch.oldFile().path();
          const originCode = await this.getOriginCode(commit, repo, originPath);
          const language = await detectLanguage(patch.newFile().path(), modifiedCode);
          commitDiff.files.push({
            language,
            path,
            originPath,
            originCode,
            modifiedCode,
            kind: DiffKind.MODIFIED,
            additions: total_additions,
            deletions: total_deletions,
          });
        } else if (patch.isRenamed()) {
          const path = patch.newFile().path();
          commitDiff.files.push({
            path,
            originPath: patch.oldFile().path(),
            kind: DiffKind.RENAMED,
            additions: total_additions,
            deletions: total_deletions,
          });
        }
      }
    }
    return commitDiff;
  }

  public async getDiff(uri: string, oldRevision: string, newRevision: string): Promise<Diff> {
    const repo = await this.openRepo(uri);
    const oldCommit = await this.getCommit(uri, oldRevision);
    const newCommit = await this.getCommit(uri, newRevision);
    const oldTree = await oldCommit.getTree();
    const newTree = await newCommit.getTree();

    const diff = await NodeGitDiff.treeToTree(repo, oldTree, newTree);

    const res: Diff = {
      additions: 0,
      deletions: 0,
      files: [],
    };
    const patches = await diff.patches();
    for (const patch of patches) {
      const { total_deletions, total_additions } = patch.lineStats();
      res.additions += total_additions;
      res.deletions += total_deletions;
      if (patch.isAdded()) {
        const path = patch.newFile().path();
        res.files.push({
          path,
          additions: total_additions,
          deletions: total_deletions,
          kind: DiffKind.ADDED,
        });
      } else if (patch.isDeleted()) {
        const path = patch.oldFile().path();
        res.files.push({
          path,
          kind: DiffKind.DELETED,
          additions: total_additions,
          deletions: total_deletions,
        });
      } else if (patch.isModified()) {
        const path = patch.newFile().path();
        const originPath = patch.oldFile().path();
        res.files.push({
          path,
          originPath,
          kind: DiffKind.MODIFIED,
          additions: total_additions,
          deletions: total_deletions,
        });
      } else if (patch.isRenamed()) {
        const path = patch.newFile().path();
        res.files.push({
          path,
          originPath: patch.oldFile().path(),
          kind: DiffKind.RENAMED,
          additions: total_additions,
          deletions: total_deletions,
        });
      }
    }
    return res;
  }

  private async getOriginCode(commit: NodeGitCommit, repo: Repository, path: string) {
    for (const oid of commit.parents()) {
      const parentCommit = await repo.getCommit(oid);
      if (parentCommit) {
        const entry = await parentCommit.getEntry(path);
        if (entry) {
          return (await entry.getBlob()).content().toString('utf8');
        }
      }
    }
    return '';
  }

  private async getModifiedCode(commit: NodeGitCommit, path: string) {
    const entry = await commit.getEntry(path);
    return (await entry.getBlob()).content().toString('utf8');
  }

  private async findCommit(repo: Repository, oid: string): Promise<NodeGitCommit | null> {
    try {
      return repo.getCommit(Oid.fromString(oid));
    } catch (e) {
      return null;
    }
  }

  public async getBranchAndTags(repoUri: string): Promise<ReferenceInfo[]> {
    const gitdir = this.repoDir(repoUri);
    const remoteBranches = await GitPrime.listBranches({ gitdir, remote: 'origin' });
    const results: ReferenceInfo[] = [];
    for (const name of remoteBranches) {
      const reference = `refs/remotes/origin/${name}`;
      const commit = await this.getCommitInfo(repoUri, reference);
      if (commit) {
        results.push({
          name,
          reference,
          type: ReferenceType.REMOTE_BRANCH,
          commit,
        });
      }
    }
    const tags = await GitPrime.listTags({ gitdir });
    for (const name of tags) {
      const reference = `refs/tags/${name}`;
      const commit = await this.getCommitInfo(repoUri, reference);
      if (commit) {
        results.push({
          name,
          reference,
          type: ReferenceType.TAG,
          commit,
        });
      }
    }
    return results;
  }

  public async getCommitOr404(repoUri: string, ref: string): Promise<CommitInfo> {
    const commit = await this.getCommitInfo(repoUri, ref);
    if (!commit) {
      throw Boom.notFound(`repo ${repoUri} or ${ref} not found`);
    }
    return commit;
  }

  public async getCommitInfo(repoUri: string, ref: string): Promise<CommitInfo | null> {
    const gitdir = this.repoDir(repoUri);
    // depth: avoid infinite loop
    let obj: GitObjectDescription | null = null;
    let oid: string = '';
    if (/^[0-9a-f]{5,40}$/.test(ref)) {
      // it's possible ref is sha-1 object id
      try {
        oid = ref;
        if (oid.length < 40) {
          oid = await GitPrime.expandOid({ gitdir, oid });
        }
        obj = await GitPrime.readObject({ gitdir, oid, format: 'parsed' });
      } catch (e) {
        // expandOid or readObject failed
      }
    }
    // test if it is a reference
    if (!obj) {
      try {
        // try local branches or tags
        oid = await GitPrime.resolveRef({ gitdir, ref, depth: 10 });
      } catch (e) {
        // try remote branches
        try {
          oid = await GitPrime.resolveRef({ gitdir, ref: `origin/${ref}`, depth: 10 });
        } catch (e1) {
          // no match
        }
      }
      if (oid) {
        obj = await GitPrime.readObject({ gitdir, oid, format: 'parsed' });
      }
    }
    if (obj) {
      if (obj.type === 'commit') {
        const commit = obj.object as CommitDescription;
        return {
          id: obj.oid,
          author: commit.author.name,
          committer: commit.committer.name,
          message: commit.message,
          updated: new Date(commit.committer.timestamp * 1000),
          parents: commit.parent,
          treeId: commit.tree,
        } as CommitInfo;
      } else if (obj.type === 'tag') {
        const tag = obj.object as TagDescription;
        if (tag.type === 'commit') {
          return await this.getCommitInfo(repoUri, tag.object);
        }
      }
    }
    return null;
  }
}

export function commitInfo(commit: NodeGitCommit): CommitInfo {
  return {
    updated: commit.date(),
    message: commit.message(),
    author: commit.author().name(),
    committer: commit.committer().name(),
    id: commit.sha().substr(0, 7),
    parents: commit.parents().map(oid => oid.toString().substring(0, 7)),
    treeId: commit.treeId().tostrS(),
  };
}
