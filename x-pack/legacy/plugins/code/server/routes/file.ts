/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { KibanaRequest, KibanaResponseFactory, RequestHandlerContext } from 'src/core/server';
import { DEFAULT_TREE_CHILDREN_LIMIT } from '../git_operations';
import { CodeServerRouter } from '../security';
import { RepositoryObjectClient } from '../search';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { decodeRevisionString } from '../../common/uri_util';
import { CodeServices } from '../distributed/code_services';
import { GitServiceDefinition } from '../distributed/apis';
import { getReferenceHelper } from '../utils/repository_reference_helper';

export function fileRoute(router: CodeServerRouter, codeServices: CodeServices) {
  const gitService = codeServices.serviceFor(GitServiceDefinition);

  async function getRepoUriFromMeta(
    context: RequestHandlerContext,
    repoUri: string
  ): Promise<string | undefined> {
    const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context));

    try {
      const repo = await repoObjectClient.getRepository(repoUri);
      await getReferenceHelper(req.getSavedObjectsClient()).ensureReference(repo.uri);
      return repo.uri;
    } catch (e) {
      return undefined;
    }
  }

  router.route({
    path: '/api/code/repo/{uri*3}/tree/{ref}/{path*}',
    method: 'GET',
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri, path, ref } = req.params as any;
      const revision = decodeRevisionString(ref);
      const queries = req.query as any;
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
      const endpoint = await codeServices.locate(req, uri);
      try {
        return await gitService.fileTree(endpoint, {
          uri: repoUri,
          path,
          revision,
          skip,
          limit,
          withParents,
          flatten,
        });
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
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri, path, ref } = req.params as any;
      const revision = decodeRevisionString(ref);
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      const endpoint = await codeServices.locate(req, uri);
      try {
        const blob = await gitService.blob(endpoint, {
          uri,
          path,
          line: (req.query as any).line as string,
          revision: decodeURIComponent(revision),
        });

        if (blob.imageType) {
          const response = h.response(blob.content);
          response.type(blob.imageType);
          return response;
        } else if (blob.isBinary) {
          return h
            .response('')
            .type('application/octet-stream')
            .code(204);
        } else {
          if (blob.content) {
            return h
              .response(blob.content)
              .type('text/plain')
              .header('lang', blob.lang!);
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
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri, path, ref } = req.params as any;
      const revision = decodeRevisionString(ref);
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      const endpoint = await codeServices.locate(req, uri);

      try {
        const blob = await gitService.raw(endpoint, { uri: repoUri, path, revision });
        if (blob.isBinary) {
          return h.response(blob.content).encoding('binary');
        } else {
          return h.response(blob.content).type('text/plain');
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
    npHandler: historyHandler,
  });

  router.route({
    path: '/api/code/repo/{uri*3}/history/{ref}/{path*}',
    method: 'GET',
    npHandler: historyHandler,
  });

  async function historyHandler(
    context: RequestHandlerContext,
    req: KibanaRequest,
    res: KibanaResponseFactory
  ) {
    const { uri, ref, path } = req.params as any;
    const revision = decodeRevisionString(ref);
    const queries = req.query as any;
    const count = queries.count ? parseInt(queries.count as string, 10) : 10;
    const after = queries.after !== undefined;
    try {
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      const endpoint = await codeServices.locate(req, uri);
      return await gitService.history(endpoint, { uri: repoUri, path, revision, count, after });
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
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri } = req.params as any;
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      const endpoint = await codeServices.locate(req, uri);

      try {
        return await gitService.branchesAndTags(endpoint, { uri: repoUri });
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
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri, revision } = req.params as any;
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      const endpoint = await codeServices.locate(req, uri);
      try {
        return await gitService.commitDiff(endpoint, {
          uri: repoUri,
          revision: decodeRevisionString(revision),
        });
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
    async npHandler(
      context: RequestHandlerContext,
      req: KibanaRequest,
      res: KibanaResponseFactory
    ) {
      const { uri, path, revision } = req.params as any;
      const repoUri = await getRepoUriFromMeta(req, uri);
      if (!repoUri) {
        return Boom.notFound(`repo ${uri} not found`);
      }
      const endpoint = await codeServices.locate(req, uri);

      try {
        return await gitService.blame(endpoint, {
          uri: repoUri,
          revision: decodeRevisionString(decodeURIComponent(revision)),
          path,
        });
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    }
  });
}
