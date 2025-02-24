/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';

import { handleEsError } from '../../shared_imports';
import {
  createMockRouter,
  MockRouter,
  routeHandlerContextMock,
} from '../../routes/__mocks__/routes.mock';
import { createRequestMock } from '../../routes/__mocks__/request.mock';

jest.mock('../es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

import indexDeprecatorFxns = require('./pre_eight_index_deprecator');

import { registerEnterpriseSearchDeprecationRoutes } from './enterprise_search_deprecations_routes';

describe('deprecation routes', () => {
  let routeDependencies: any;

  describe('POST /internal/enterprise_search/deprecations/set_enterprise_search_indices_read_only', () => {
    let mockRouter: MockRouter;

    function registerMockRouter({ mlSnapshots } = { mlSnapshots: true }) {
      mockRouter = createMockRouter();
      routeDependencies = {
        config: {
          featureSet: { mlSnapshots, migrateSystemIndices: true, reindexCorrectiveActions: true },
        },
        router: mockRouter,
        lib: { handleEsError },
      };
      registerEnterpriseSearchDeprecationRoutes(routeDependencies);
    }

    beforeEach(() => {
      registerMockRouter();
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('sets read-only and 200s correctly in happy path', async () => {
      const setIndicesReadOnlyMock = jest.spyOn(
        indexDeprecatorFxns,
        'setPreEightEnterpriseSearchIndicesReadOnly'
      );

      setIndicesReadOnlyMock.mockResolvedValue('');

      const resp = await routeDependencies.router.getHandler({
        method: 'post',
        pathPattern:
          '/internal/enterprise_search/deprecations/set_enterprise_search_indices_read_only',
      })(
        routeHandlerContextMock,
        createRequestMock({
          body: { deprecationDetails: { domainId: 'enterpriseSearch' } },
        }),
        kibanaResponseFactory
      );

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        acknowedged: true,
      });

      expect(setIndicesReadOnlyMock).toHaveBeenCalledTimes(1);
    });
  });
});
