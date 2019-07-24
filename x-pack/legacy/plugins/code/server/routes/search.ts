/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import hapi from 'hapi';
import { DocumentSearchRequest, RepositorySearchRequest, SymbolSearchRequest } from '../../model';
import { Logger } from '../log';
import { DocumentSearchClient, RepositorySearchClient, SymbolSearchClient } from '../search';
import { EsClientWithRequest } from '../utils/esclient_with_request';
import { CodeServerRouter } from '../security';

export function repositorySearchRoute(server: CodeServerRouter, log: Logger) {
  server.route({
    path: '/api/code/search/repo',
    method: 'GET',
    async handler(req) {
      let page = 1;
      const { p, q, repoScope } = req.query as hapi.RequestQuery;
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

  server.route({
    path: '/api/code/suggestions/repo',
    method: 'GET',
    async handler(req) {
      let page = 1;
      const { p, q, repoScope } = req.query as hapi.RequestQuery;
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

export function documentSearchRoute(server: CodeServerRouter, log: Logger) {
  server.route({
    path: '/api/code/search/doc',
    method: 'GET',
    async handler(req) {
      let page = 1;
      const { p, q, langs, repos, repoScope } = req.query as hapi.RequestQuery;
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

  server.route({
    path: '/api/code/suggestions/doc',
    method: 'GET',
    async handler(req) {
      let page = 1;
      const { p, q, repoScope } = req.query as hapi.RequestQuery;
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
}

export function symbolSearchRoute(server: CodeServerRouter, log: Logger) {
  const symbolSearchHandler = async (req: hapi.Request) => {
    let page = 1;
    const { p, q, repoScope } = req.query as hapi.RequestQuery;
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
  server.route({
    path: '/api/code/suggestions/symbol',
    method: 'GET',
    handler: symbolSearchHandler,
  });
  server.route({
    path: '/api/code/search/symbol',
    method: 'GET',
    handler: symbolSearchHandler,
  });
}
