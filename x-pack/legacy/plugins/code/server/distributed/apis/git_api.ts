/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import fileType from 'file-type';
import Boom from 'boom';
import { Commit, Oid, Revwalk } from '@elastic/nodegit';
import { commitInfo, GitOperations } from '../../git_operations';
import { FileTree } from '../../../model';
import { RequestContext, ServiceHandlerFor } from '../service_definition';
import { extractLines } from '../../utils/buffer';
import { detectLanguage } from '../../utils/detect_language';
import { TEXT_FILE_LIMIT } from '../../../common/file';
import { CommitInfo, ReferenceInfo } from '../../../model/commit';
import { CommitDiff } from '../../../common/git_diff';
import { GitBlame } from '../../../common/git_blame';

interface FileLocation {
  uri: string;
  path: string;
  revision: string;
}
export const GitServiceDefinitionOption = { routePrefix: '/api/code/internal/git' };
export const GitServiceDefinition = {
  fileTree: {
    request: {} as {
      uri: string;
      path: string;
      revision: string;
      skip: number;
      limit: number;
      withParents: boolean;
      flatten: boolean;
    },
    response: {} as FileTree,
  },
  blob: {
    request: {} as FileLocation & { line?: string },
    response: {} as {
      isBinary: boolean;
      imageType?: string;
      content?: string;
      lang?: string;
    },
  },
  raw: {
    request: {} as FileLocation,
    response: {} as {
      isBinary: boolean;
      content: string;
    },
  },
  history: {
    request: {} as FileLocation & {
      count: number;
      after: boolean;
    },
    response: {} as CommitInfo[],
  },
  branchesAndTags: {
    request: {} as { uri: string },
    response: {} as ReferenceInfo[],
  },
  commitDiff: {
    request: {} as { uri: string; revision: string },
    response: {} as CommitDiff,
  },
  blame: {
    request: {} as FileLocation,
    response: {} as GitBlame[],
  },
  commit: {
    request: {} as { uri: string; revision: string },
    response: {} as CommitInfo,
  },
  headRevision: {
    request: {} as { uri: string },
    response: {} as string,
  },
};

export const getGitServiceHandler = (
  gitOps: GitOperations
): ServiceHandlerFor<typeof GitServiceDefinition> => ({
  async fileTree(
    { uri, path, revision, skip, limit, withParents, flatten },
    context: RequestContext
  ) {
    return await gitOps.fileTree(uri, path, revision, skip, limit, withParents, flatten);
  },
  async blob({ uri, path, revision, line }) {
    const blob = await gitOps.fileContent(uri, path, revision);
    const isBinary = blob.isBinary();
    if (isBinary) {
      const type = fileType(blob.content());
      if (type && type.mime && type.mime.startsWith('image/')) {
        return {
          isBinary,
          imageType: type.mime,
          content: blob.content().toString(),
        };
      } else {
        return {
          isBinary,
        };
      }
    } else {
      if (line) {
        const [from, to] = line.split(',');
        let fromLine = parseInt(from, 10);
        let toLine = to === undefined ? fromLine + 1 : parseInt(to, 10);
        if (fromLine > toLine) {
          [fromLine, toLine] = [toLine, fromLine];
        }
        const lines = extractLines(blob.content(), fromLine, toLine);
        const lang = await detectLanguage(path, lines);
        return {
          isBinary,
          lang,
          content: lines,
        };
      } else if (blob.rawsize() <= TEXT_FILE_LIMIT) {
        const lang = await detectLanguage(path, blob.content());
        return {
          isBinary,
          lang,
          content: blob.content().toString(),
        };
      } else {
        return {
          isBinary,
        };
      }
    }
  },
  async raw({ uri, path, revision }) {
    const blob = await gitOps.fileContent(uri, path, revision);
    const isBinary = blob.isBinary();
    return {
      isBinary,
      content: blob.content().toString(),
    };
  },
  async history({ uri, path, revision, count, after }) {
    const repository = await gitOps.openRepo(uri);
    const commit = await gitOps.getCommitInfo(uri, revision);
    if (commit === null) {
      throw Boom.notFound(`commit ${revision} not found in repo ${uri}`);
    }
    const walk = repository.createRevWalk();
    walk.sorting(Revwalk.SORT.TIME);
    const commitId = Oid.fromString(commit!.id);
    walk.push(commitId);
    let commits: Commit[];
    if (path) {
      // magic number 10000: how many commits at the most to iterate in order to find the commits contains the path
      const results = await walk.fileHistoryWalk(path, count, 10000);
      commits = results.map(result => result.commit);
    } else {
      commits = await walk.getCommits(count);
    }
    if (after && commits.length > 0) {
      if (commits[0].id().equal(commitId)) {
        commits = commits.slice(1);
      }
    }
    return commits.map(commitInfo);
  },
  async branchesAndTags({ uri }) {
    return await gitOps.getBranchAndTags(uri);
  },
  async commitDiff({ uri, revision }) {
    return await gitOps.getCommitDiff(uri, revision);
  },
  async blame({ uri, path, revision }) {
    return await gitOps.blame(uri, revision, path);
  },
  async commit({ uri, revision }) {
    return await gitOps.getCommitOr404(uri, revision);
  },
  async headRevision({ uri }) {
    return await gitOps.getHeadRevision(uri);
  },
});
