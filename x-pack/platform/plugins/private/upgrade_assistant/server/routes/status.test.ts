/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaResponseFactory } from '@kbn/core/server';

import { handleEsError } from '../shared_imports';
import { createMockRouter, routeHandlerContextMock } from './__mocks__/routes.mock';
import { createRequestMock } from './__mocks__/request.mock';
import { registerUpgradeStatusRoute } from './status';
import { getESUpgradeStatus } from '../lib/es_deprecations_status';
import { getKibanaUpgradeStatus } from '../lib/kibana_status';
import { getESSystemIndicesMigrationStatus } from '../lib/es_system_indices_migration';
import type { FeatureSet } from '../../common/types';
import { versionService } from '../lib/version';
import { getMockVersionInfo } from '../lib/__fixtures__/version';

const { currentVersion, nextMajor } = getMockVersionInfo();
jest.mock('../lib/es_version_precheck', () => ({
  versionCheckHandlerWrapper: (a: any) => a,
}));

jest.mock('../lib/es_deprecations_status', () => ({
  getESUpgradeStatus: jest.fn(),
}));
const getESUpgradeStatusMock = getESUpgradeStatus as jest.Mock;

jest.mock('../lib/kibana_status', () => ({
  getKibanaUpgradeStatus: jest.fn(),
}));
const getKibanaUpgradeStatusMock = getKibanaUpgradeStatus as jest.Mock;

jest.mock('../lib/es_system_indices_migration', () => ({
  getESSystemIndicesMigrationStatus: jest.fn(),
}));
const getESSystemIndicesMigrationStatusMock = getESSystemIndicesMigrationStatus as jest.Mock;

const esDeprecationsResponse = {
  totalCriticalDeprecations: 1,
  migrationsDeprecations: [
    {
      // This is a critical migration deprecation object, but it's not used in the tests
    },
  ],
  totalCriticalHealthIssues: 0,
  enrichedHealthIndicators: [],
};

const esHealthResponse = {
  totalCriticalDeprecations: 1,
  migrationsDeprecations: [
    {
      // This is a critical migration deprecation object, but it's not used in the tests
    },
  ],
  totalCriticalHealthIssues: 1,
  enrichedHealthIndicators: [
    {
      status: 'red', // this is a critical health issue
    },
  ],
};

const esNoDeprecationsResponse = {
  totalCriticalDeprecations: 0,
  migrationsDeprecations: [],
  totalCriticalHealthIssues: 0,
  enrichedHealthIndicators: [],
};

const systemIndicesMigrationResponse = {
  migration_status: 'MIGRATION_NEEDED',
  features: [
    {
      feature_name: 'machine_learning',
      minimum_index_version: '7.1.1',
      migration_status: 'MIGRATION_NEEDED',
      indices: [
        {
          index: '.ml-config',
          version: '7.1.1',
        },
        {
          index: '.ml-notifications',
          version: '7.1.1',
        },
      ],
    },
  ],
};

const systemIndicesNoMigrationResponse = {
  migration_status: 'NO_MIGRATION_NEEDED',
  features: [],
};

describe('Status API', () => {
  beforeAll(() => {
    versionService.setup('8.17.0');
  });

  describe('GET /api/upgrade_assistant/status for major upgrade', () => {
    const registerRoutes = (featureSetOverrides: Partial<FeatureSet> = {}) => {
      const mockRouter = createMockRouter();
      const routeDependencies: any = {
        config: {
          featureSet: {
            mlSnapshots: true,
            migrateSystemIndices: true,
            reindexCorrectiveActions: true,
            ...featureSetOverrides,
          },
        },
        router: mockRouter,
        lib: { handleEsError },
        current: currentVersion,
        defaultTarget: nextMajor,
      };

      registerUpgradeStatusRoute(routeDependencies);

      return { mockRouter, routeDependencies };
    };
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('returns readyForUpgrade === false if Kibana or ES contain critical deprecations and no system indices need migration', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 1,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesNoMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(1);
      expect(getKibanaUpgradeStatusMock).toBeCalledTimes(1);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: false,
        details:
          'The following issues must be resolved before upgrading: 1 Elasticsearch deprecation issue, 1 Kibana deprecation issue.',
      });
    });

    it('returns readyForUpgrade === false if Kibana or ES contain critical deprecations and system indices need migration', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 1,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(1);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: false,
        details:
          'The following issues must be resolved before upgrading: 1 unmigrated system index, 1 Elasticsearch deprecation issue, 1 Kibana deprecation issue.',
      });
    });

    it('returns readyForUpgrade === false if no critical Kibana or ES deprecations but system indices need migration', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esNoDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(1);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: false,
        details:
          'The following issues must be resolved before upgrading: 1 unmigrated system index.',
      });
    });

    it('returns readyForUpgrade === true if there are no critical deprecations and no system indices need migration', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esNoDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesNoMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation warnings have been resolved.',
      });
    });

    it('skips ES system indices migration check when featureSet.migrateSystemIndices is set to false', async () => {
      const { routeDependencies } = registerRoutes({ migrateSystemIndices: false });
      getESUpgradeStatusMock.mockResolvedValue(esNoDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesMigrationResponse);
      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(0);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation warnings have been resolved.',
      });
    });

    it('returns an error if it throws', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockRejectedValue(new Error('test error'));

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/status',
        })(routeHandlerContextMock, createRequestMock(), kibanaResponseFactory)
      ).rejects.toThrow('test error');
    });
  });

  describe('GET /api/upgrade_assistant/status for non-major upgrade', () => {
    const registerRoutes = (featureSetOverrides: Partial<FeatureSet> = {}) => {
      const mockRouter = createMockRouter();
      const routeDependencies: any = {
        config: {
          featureSet: {
            mlSnapshots: true,
            migrateSystemIndices: true,
            reindexCorrectiveActions: true,
            ...featureSetOverrides,
          },
        },
        router: mockRouter,
        lib: { handleEsError },
        current: currentVersion,
        defaultTarget: nextMajor,
      };

      registerUpgradeStatusRoute(routeDependencies);

      return { mockRouter, routeDependencies };
    };
    const testQuery = { query: { targetVersion: '8.18.0' } };
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('returns readyForUpgrade === false if ES contains critical health issues, ignoring deprecations', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esHealthResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 1,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesNoMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(testQuery), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(1);
      expect(getKibanaUpgradeStatusMock).toBeCalledTimes(1);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: false,
        details:
          'The following issues must be resolved before upgrading: 1 Elasticsearch deprecation issue.',
      });
    });

    it('returns readyForUpgrade === true if Kibana or ES contain critical deprecations and no system indices need migration', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 1,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesNoMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(testQuery), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(1);
      expect(getKibanaUpgradeStatusMock).toBeCalledTimes(1);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation warnings have been resolved.',
      });
    });

    it('returns readyForUpgrade === true if Kibana or ES contain critical deprecations and system indices need migration', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 1,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(testQuery), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(1);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation warnings have been resolved.',
      });
    });

    it('returns readyForUpgrade === true if no critical Kibana or ES deprecations but system indices need migration', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esNoDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(testQuery), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(1);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation warnings have been resolved.',
      });
    });

    it('returns readyForUpgrade === true if there are no critical deprecations and no system indices need migration', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockResolvedValue(esNoDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesNoMigrationResponse);

      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(testQuery), kibanaResponseFactory);

      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation warnings have been resolved.',
      });
    });

    it('skips ES system indices migration check when featureSet.migrateSystemIndices is set to false', async () => {
      const { routeDependencies } = registerRoutes({ migrateSystemIndices: false });
      getESUpgradeStatusMock.mockResolvedValue(esNoDeprecationsResponse);

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      getESSystemIndicesMigrationStatusMock.mockResolvedValue(systemIndicesMigrationResponse);
      const resp = await routeDependencies.router.getHandler({
        method: 'get',
        pathPattern: '/api/upgrade_assistant/status',
      })(routeHandlerContextMock, createRequestMock(testQuery), kibanaResponseFactory);

      expect(getESSystemIndicesMigrationStatusMock).toBeCalledTimes(0);
      expect(resp.status).toEqual(200);
      expect(resp.payload).toEqual({
        readyForUpgrade: true,
        details: 'All deprecation warnings have been resolved.',
      });
    });

    it('returns an error if it throws', async () => {
      const { routeDependencies } = registerRoutes();
      getESUpgradeStatusMock.mockRejectedValue(new Error('test error'));

      getKibanaUpgradeStatusMock.mockResolvedValue({
        totalCriticalDeprecations: 0,
      });

      await expect(
        routeDependencies.router.getHandler({
          method: 'get',
          pathPattern: '/api/upgrade_assistant/status',
        })(routeHandlerContextMock, createRequestMock(testQuery), kibanaResponseFactory)
      ).rejects.toThrow('test error');
    });
  });
});
