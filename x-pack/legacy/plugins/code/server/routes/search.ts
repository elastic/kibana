/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { RequestFacade, RequestQueryFacade } from '../../';
import {
  CommitSearchRequest,
  DocumentSearchRequest,
  RepositorySearchRequest,
  ResolveSnippetsIntegrationRequest,
  SymbolSearchRequest,
} from '../../model';
import { Logger } from '../log';
import {
  CommitSearchClient,
  DocumentSearchClient,
  IntegrationsSearchClient,
  RepositorySearchClient,
  SymbolSearchClient,
} from '../search';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { CodeServerRouter } from '../security';

export function repositorySearchRoute(router: CodeServerRouter, log: Logger) {
  router.route({
    path: '/api/code/search/repo',
    method: 'GET',
    async handler(req: RequestFacade) {
      let page = 1;
      const { p, q, repoScope } = req.query as RequestQueryFacade;
      if (p) {
        page = parseInt(p as string, 10);
      }

      let scope: string[] = [];
      if (typeof repoScope === 'string') {
        scope = repoScope.split(',');
      }

      const searchReq: RepositorySearchRequest = {
        query: q as string,
        page,
        repoScope: scope,
      };
      try {
        const repoSearchClient = new RepositorySearchClient(new EsClientWithRequest(req), log);
        const res = await repoSearchClient.search(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception`);
      }
    },
  });

  router.route({
    path: '/api/code/suggestions/repo',
    method: 'GET',
    async handler(req: RequestFacade) {
      let page = 1;
      const { p, q, repoScope } = req.query as RequestQueryFacade;
      if (p) {
        page = parseInt(p as string, 10);
      }

      let scope: string[] = [];
      if (typeof repoScope === 'string') {
        scope = repoScope.split(',');
      }

      const searchReq: RepositorySearchRequest = {
        query: q as string,
        page,
        repoScope: scope,
      };
      try {
        const repoSearchClient = new RepositorySearchClient(new EsClientWithRequest(req), log);
        const res = await repoSearchClient.suggest(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception`);
      }
    },
  });
}

export function documentSearchRoute(router: CodeServerRouter, log: Logger) {
  router.route({
    path: '/api/code/search/doc',
    method: 'GET',
    async handler(req: RequestFacade) {
      let page = 1;
      const { p, q, langs, repos, repoScope } = req.query as RequestQueryFacade;
      if (p) {
        page = parseInt(p as string, 10);
      }

      let scope: string[] = [];
      if (typeof repoScope === 'string') {
        scope = [repoScope];
      } else if (Array.isArray(repoScope)) {
        scope = repoScope;
      }

      const searchReq: DocumentSearchRequest = {
        query: q as string,
        page,
        langFilters: langs ? (langs as string).split(',') : [],
        repoFilters: repos ? decodeURIComponent(repos as string).split(',') : [],
        repoScope: scope,
      };
      try {
        const docSearchClient = new DocumentSearchClient(new EsClientWithRequest(req), log);
        const res = await docSearchClient.search(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception`);
      }
    },
  });

  router.route({
    path: '/api/code/suggestions/doc',
    method: 'GET',
    async handler(req: RequestFacade) {
      let page = 1;
      const { p, q, repoScope } = req.query as RequestQueryFacade;
      if (p) {
        page = parseInt(p as string, 10);
      }

      let scope: string[] = [];
      if (typeof repoScope === 'string') {
        scope = repoScope.split(',');
      }

      const searchReq: DocumentSearchRequest = {
        query: q as string,
        page,
        repoScope: scope,
      };
      try {
        const docSearchClient = new DocumentSearchClient(new EsClientWithRequest(req), log);
        const res = await docSearchClient.suggest(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception`);
      }
    },
  });

  // Resolve source code snippets base on APM's stacktrace item data including:
  // * repoUri: ID of the repository
  // * revision: Optional. Revision of the file.
  // * filePath: the path of the file.
  // * lineNumStart: the start line number of the snippet.
  // * lineNumEnd: Optional. The end line number of the snippet.
  router.route({
    path: '/api/code/integration/snippets',
    method: 'GET',
    async handler(req: RequestFacade) {
      const { repoUri, revision, filePath, lineNum, lineNumEnd } = req.query as RequestQueryFacade;

      try {
        const integRequest: ResolveSnippetsIntegrationRequest = {
          repoUris: typeof repoUri === 'string' ? [repoUri] : (repoUri as string[]),
          revision: revision ? (revision as string) : undefined,
          filePath: filePath as string,
          lineNumStart: lineNum ? parseInt(lineNum as string, 10) : 0,
          lineNumEnd: lineNumEnd ? parseInt(lineNumEnd as string, 10) : undefined,
        };
        const integClient = new IntegrationsSearchClient(new EsClientWithRequest(req), log);
        const res = await integClient.resolveSnippets(integRequest);
        return res;
      } catch (error) {
        return Boom.internal(`Invalid request for resovling snippets.`);
      }
    },
  });
}

export function symbolSearchRoute(router: CodeServerRouter, log: Logger) {
  const symbolSearchHandler = async (req: RequestFacade) => {
    let page = 1;
    const { p, q, repoScope } = req.query as RequestQueryFacade;
    if (p) {
      page = parseInt(p as string, 10);
    }

    let scope: string[] = [];
    if (typeof repoScope === 'string') {
      scope = repoScope.split(',');
    }

    const searchReq: SymbolSearchRequest = {
      query: q as string,
      page,
      repoScope: scope,
    };
    try {
      const symbolSearchClient = new SymbolSearchClient(new EsClientWithRequest(req), log);
      const res = await symbolSearchClient.suggest(searchReq);
      return res;
    } catch (error) {
      return Boom.internal(`Search Exception`);
    }
  };

  // Currently these 2 are the same.
  router.route({
    path: '/api/code/suggestions/symbol',
    method: 'GET',
    handler: symbolSearchHandler,
  });
  router.route({
    path: '/api/code/search/symbol',
    method: 'GET',
    handler: symbolSearchHandler,
  });
}

export function commitSearchRoute(router: CodeServerRouter, log: Logger) {
  router.route({
    path: '/api/code/search/commit',
    method: 'GET',
    async handler(req: RequestFacade) {
      let page = 1;
      const { p, q, repos, repoScope } = req.query as RequestQueryFacade;
      if (p) {
        page = parseInt(p as string, 10);
      }

      let scope: string[] = [];
      if (typeof repoScope === 'string') {
        scope = [repoScope];
      } else if (Array.isArray(repoScope)) {
        scope = repoScope;
      }

      const searchReq: CommitSearchRequest = {
        query: q as string,
        page,
        repoFilters: repos ? decodeURIComponent(repos as string).split(',') : [],
        repoScope: scope,
      };
      try {
        const commitSearchClient = new CommitSearchClient(new EsClientWithRequest(req), log);
        const res = await commitSearchClient.search(searchReq);
        return res;
      } catch (error) {
        return Boom.internal(`Search Exception`);
      }
    },
  });
}
