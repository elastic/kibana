/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Commit, Oid, Revwalk } from '@elastic/nodegit';
import Boom from 'boom';
import fileType from 'file-type';

import { RequestFacade, RequestQueryFacade, ResponseToolkitFacade } from '../../';
import { commitInfo, DEFAULT_TREE_CHILDREN_LIMIT, GitOperations } from '../git_operations';
import { extractLines } from '../utils/buffer';
import { detectLanguage } from '../utils/detect_language';
import { CodeServerRouter } from '../security';
import { RepositoryObjectClient } from '../search';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { TEXT_FILE_LIMIT } from '../../common/file';
import { decodeRevisionString } from '../../common/uri_util';

export function fileRoute(router: CodeServerRouter, gitOps: GitOperations) {
  async function getRepoUriFromMeta(
    req: RequestFacade,
    repoUri: string
  ): Promise<string | undefined> {
    const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(req));

    try {
      const repo = await repoObjectClient.getRepository(repoUri);
      return repo.uri;
    } catch (e) {
      return undefined;
    }
  }

  router.route({
    path: '/api/code/repo/{uri*3}/tree/{ref}/{path*}',
    method: 'GET',
    async handler(req: RequestFacade) {
      const { uri, path, ref } = req.params;
      const revision = decodeRevisionString(ref);
      const queries = req.query as RequestQueryFacade;
      const limit = queries.limit
        ? parseInt(queries.limit as string, 10)
        : DEFAULT_TREE_CHILDREN_LIMIT;
      const skip = queries.skip ? parseInt(queries.skip as string, 10) : 0;
      const withParents = 'parents' in queries;
      const flatten = 'flatten' in queries;
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }

      try {
        return await gitOps.fileTree(repoUri, path, revision, skip, limit, withParents, flatten);
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  router.route({
    path: '/api/code/repo/{uri*3}/blob/{ref}/{path*}',
    method: 'GET',
    async handler(req: RequestFacade, h: ResponseToolkitFacade) {
      const { uri, path, ref } = req.params;
      const revision = decodeRevisionString(ref);
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const blob = await gitOps.fileContent(repoUri, path, decodeURIComponent(revision));
        if (blob.isBinary()) {
          const type = fileType(blob.content());
          if (type && type.mime && type.mime.startsWith('image/')) {
            const response = h.response(blob.content());
            response.type(type.mime);
            return response;
          } else {
            // this api will return a empty response with http code 204
            return h
              .response('')
              .type('application/octet-stream')
              .code(204);
          }
        } else {
          const line = (req.query as RequestQueryFacade).line as string;
          if (line) {
            const [from, to] = line.split(',');
            let fromLine = parseInt(from, 10);
            let toLine = to === undefined ? fromLine + 1 : parseInt(to, 10);
            if (fromLine > toLine) {
              [fromLine, toLine] = [toLine, fromLine];
            }
            const lines = extractLines(blob.content(), fromLine, toLine);
            const lang = await detectLanguage(path, lines);
            return h
              .response(lines)
              .type(`text/plain`)
              .header('lang', lang);
          } else if (blob.content().length <= TEXT_FILE_LIMIT) {
            const lang = await detectLanguage(path, blob.content());
            return h
              .response(blob.content())
              .type(`text/plain'`)
              .header('lang', lang);
          } else {
            return h.response('').type(`text/big`);
          }
        }
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  router.route({
    path: '/app/code/repo/{uri*3}/raw/{ref}/{path*}',
    method: 'GET',
    async handler(req: RequestFacade, h: ResponseToolkitFacade) {
      const { uri, path, ref } = req.params;
      const revision = decodeRevisionString(ref);
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const blob = await gitOps.fileContent(repoUri, path, revision);
        if (blob.isBinary()) {
          return h.response(blob.content()).type('application/octet-stream');
        } else {
          return h.response(blob.content()).type('text/plain');
        }
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  router.route({
    path: '/api/code/repo/{uri*3}/history/{ref}',
    method: 'GET',
    handler: historyHandler,
  });

  router.route({
    path: '/api/code/repo/{uri*3}/history/{ref}/{path*}',
    method: 'GET',
    handler: historyHandler,
  });

  async function historyHandler(req: RequestFacade) {
    const { uri, ref, path } = req.params;
    const revision = decodeRevisionString(ref);
    const queries = req.query as RequestQueryFacade;
    const count = queries.count ? parseInt(queries.count as string, 10) : 10;
    const after = queries.after !== undefined;
    try {
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      const repository = await gitOps.openRepo(repoUri);
      const commit = await gitOps.getCommitInfo(repoUri, revision);
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
    } catch (e) {
      if (e.isBoom) {
        return e;
      } else {
        return Boom.internal(e.message || e.name);
      }
    }
  }

  router.route({
    path: '/api/code/repo/{uri*3}/references',
    method: 'GET',
    async handler(req: RequestFacade) {
      const uri = req.params.uri;
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        return await gitOps.getBranchAndTags(repoUri);
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  router.route({
    path: '/api/code/repo/{uri*3}/diff/{revision}',
    method: 'GET',
    async handler(req: RequestFacade) {
      const { uri, revision } = req.params;
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const diff = await gitOps.getCommitDiff(repoUri, decodeRevisionString(revision));
        return diff;
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  router.route({
    path: '/api/code/repo/{uri*3}/blame/{revision}/{path*}',
    method: 'GET',
    async handler(req: RequestFacade) {
      const { uri, path, revision } = req.params;
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      try {
        const blames = await gitOps.blame(
          repoUri,
          decodeRevisionString(decodeURIComponent(revision)),
          path
        );
        return blames;
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });
}
