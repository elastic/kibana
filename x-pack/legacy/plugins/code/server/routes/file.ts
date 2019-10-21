/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
    req: KibanaRequest,
    repoUri: string
  ): Promise<string | undefined> {
    const repoObjectClient = new RepositoryObjectClient(new EsClientWithRequest(context, req));

    try {
      const repo = await repoObjectClient.getRepository(repoUri);
      await getReferenceHelper(context.core.savedObjects.client).ensureReference(repo.uri);
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
      const repoUri = await getRepoUriFromMeta(context, req, uri);
      if (!repoUri) {
        return res.notFound({ body: `repo ${uri} not found` });
      }
      const endpoint = await codeServices.locate(req, uri);
      try {
        const filetree = await gitService.fileTree(endpoint, {
          uri: repoUri,
          path,
          revision,
          skip,
          limit,
          withParents,
          flatten,
        });
        return res.ok({ body: filetree });
      } catch (e) {
        if (e.isBoom) {
          return res.customError({
            body: e.error,
            statusCode: e.statusCode ? e.statusCode : 500,
          });
        } else {
          return res.internalError({ body: e.message || e.name });
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
      const repoUri = await getRepoUriFromMeta(context, req, uri);
      if (!repoUri) {
        return res.notFound({ body: `repo ${uri} not found` });
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
          return res.ok({
            body: blob.content,
            headers: { 'Content-Type': blob.imageType },
          });
        } else if (blob.isBinary) {
          return res.noContent({
            headers: { 'Content-Type': 'application/octet-stream' },
          });
        } else {
          if (blob.content) {
            return res.ok({
              body: blob.content,
              headers: {
                'Content-Type': 'text/plain',
                lang: blob.lang!,
              },
            });
          } else {
            return res.ok({
              body: blob.content,
              headers: { 'Content-Type': 'text/big' },
            });
          }
        }
      } catch (e) {
        if (e.isBoom) {
          return res.customError({
            body: e.error,
            statusCode: e.statusCode ? e.statusCode : 500,
          });
        } else {
          return res.internalError({ body: e.message || e.name });
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
      const repoUri = await getRepoUriFromMeta(context, req, uri);
      if (!repoUri) {
        return res.notFound({ body: `repo ${uri} not found` });
      }
      const endpoint = await codeServices.locate(req, uri);

      try {
        const blob = await gitService.raw(endpoint, { uri: repoUri, path, revision });
        if (blob.isBinary) {
          return res.ok({
            body: blob.content,
            headers: { 'Content-Transfer-Encoding': 'binary' },
          });
        } else {
          return res.ok({
            body: blob.content,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      } catch (e) {
        if (e.isBoom) {
          return res.customError({
            body: e.error,
            statusCode: e.statusCode ? e.statusCode : 500,
          });
        } else {
          return res.internalError({ body: e.message || e.name });
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
      const repoUri = await getRepoUriFromMeta(context, req, uri);
      if (!repoUri) {
        return res.notFound({ body: `repo ${uri} not found` });
      }
      const endpoint = await codeServices.locate(req, uri);
      const history = await gitService.history(endpoint, {
        uri: repoUri,
        path,
        revision,
        count,
        after,
      });
      return res.ok({ body: history });
    } catch (e) {
      if (e.isBoom) {
        return res.customError({
          body: e.error,
          statusCode: e.statusCode ? e.statusCode : 500,
        });
      } else {
        return res.internalError({ body: e.message || e.name });
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
      const repoUri = await getRepoUriFromMeta(context, req, uri);
      if (!repoUri) {
        return res.badRequest({ body: `repo ${uri} not found` });
      }
      const endpoint = await codeServices.locate(req, uri);

      try {
        const branchesAndTags = await gitService.branchesAndTags(endpoint, { uri: repoUri });
        return res.ok({ body: branchesAndTags });
      } catch (e) {
        if (e.isBoom) {
          return res.customError({
            body: e.error,
            statusCode: e.statusCode ? e.statusCode : 500,
          });
        } else {
          return res.internalError({ body: e.message || e.name });
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
      const repoUri = await getRepoUriFromMeta(context, req, uri);
      if (!repoUri) {
        return res.notFound({ body: `repo ${uri} not found` });
      }
      const endpoint = await codeServices.locate(req, uri);
      try {
        const diff = await gitService.commitDiff(endpoint, {
          uri: repoUri,
          revision: decodeRevisionString(revision),
        });
        return res.ok({ body: diff });
      } catch (e) {
        if (e.isBoom) {
          return res.customError({
            body: e.error,
            statusCode: e.statusCode ? e.statusCode : 500,
          });
        } else {
          return res.internalError({ body: e.message || e.name });
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
      const repoUri = await getRepoUriFromMeta(context, req, uri);
      if (!repoUri) {
        return res.notFound({ body: `repo ${uri} not found` });
      }
      const endpoint = await codeServices.locate(req, uri);

      try {
        const blames = await gitService.blame(endpoint, {
          uri: repoUri,
          revision: decodeRevisionString(decodeURIComponent(revision)),
          path,
        });
        return res.ok({ body: blames });
      } catch (e) {
        if (e.isBoom) {
          return res.customError({
            body: e.error,
            statusCode: e.statusCode ? e.statusCode : 500,
          });
        } else {
          return res.internalError({ body: e.message || e.name });
        }
      }
    },
  });
}
