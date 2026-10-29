/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import type { RequestHandler } from '@kbn/core/server';
import {
  ACTIONS_INDEX,
  ACTION_RESPONSES_DATA_STREAM_INDEX,
  API_VERSIONS,
} from '../../../common/constants';
import type { OsqueryAppContext } from '../../lib/osquery_app_context_services';
import { hasConnectedRemoteClusters, prefixIndexPatternsWithCcs } from '../../utils/ccs_utils';
import { getUnifiedHistoryRoute } from './get_unified_history_route';

jest.mock('../../utils/get_internal_saved_object_client', () => ({
  createInternalSavedObjectsClientForSpaceId: jest.fn().mockResolvedValue({
    find: jest.fn().mockResolvedValue({ saved_objects: [] }),
  }),
}));

jest.mock('../../utils/ccs_utils', () => ({
  hasConnectedRemoteClusters: jest.fn().mockResolvedValue(false),
  prefixIndexPatternsWithCcs: jest.fn((pattern: string) => pattern),
}));

jest.mock('../../lib/get_result_counts_for_actions', () => ({
  getResultCountsForActions: jest.fn().mockResolvedValue(new Map()),
}));

// `config.validate.request` is typed as a union (`false | VersionedRouteValidation | (() => ...)`)
// to cover every possible route shape; this route always registers the plain object form.
interface QuerySchemaValidator {
  validate: (value: unknown) => unknown;
}

interface UnifiedHistoryValidationConfig {
  request: { query: QuerySchemaValidator };
}

describe('getUnifiedHistoryRoute', () => {
  let routeHandler: RequestHandler;
  let mockOsqueryContext: OsqueryAppContext;
  let mockEsClient: { search: jest.Mock };
  let mockScopedEsClient: { search: jest.Mock };
  let queryValidator: QuerySchemaValidator;

  const emptyScheduledAggregations = {
    aggregations: { scheduled_executions: { buckets: [] } },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockEsClient = { search: jest.fn() };
    mockScopedEsClient = { search: jest.fn() };

    mockOsqueryContext = {
      isCpsActive: jest.fn().mockResolvedValue(false),
      logFactory: {
        get: jest.fn().mockReturnValue({ debug: jest.fn(), warn: jest.fn(), error: jest.fn() }),
      },
      service: {
        getActiveSpace: jest.fn().mockResolvedValue({ id: 'default' }),
      },
      getStartServices: jest.fn().mockResolvedValue([
        {
          elasticsearch: {
            client: {
              asInternalUser: mockEsClient,
              asScoped: jest.fn().mockReturnValue({ asCurrentUser: mockScopedEsClient }),
            },
          },
        },
      ]),
    } as unknown as OsqueryAppContext;
  });

  const setupRoute = () => {
    const httpService = httpServiceMock.createSetupContract();
    const mockRouter = httpService.createRouter();
    getUnifiedHistoryRoute(mockRouter, mockOsqueryContext);

    const route = mockRouter.versioned.getRoute('get', '/api/osquery/history');
    const routeVersion = route.versions[API_VERSIONS.public.v1];
    if (!routeVersion) {
      throw new Error(`Handler for version [${API_VERSIONS.public.v1}] not found!`);
    }

    routeHandler = routeVersion.handler;

    const validateConfig = routeVersion.config
      .validate as unknown as UnifiedHistoryValidationConfig;
    queryValidator = validateConfig.request.query;
  };

  describe('request validation', () => {
    beforeEach(() => {
      setupRoute();
    });

    const LENGTH_LIMITS = [
      { field: 'nextPage', limit: 4096 },
      { field: 'kuery', limit: 10_000 },
      { field: 'userIds', limit: 10_000 },
      { field: 'tags', limit: 10_000 },
      { field: 'startDate', limit: 64 },
      { field: 'endDate', limit: 64 },
    ] as const;

    it.each(LENGTH_LIMITS)('accepts $field at the maximum length of $limit', ({ field, limit }) => {
      expect(() => queryValidator.validate({ [field]: 'a'.repeat(limit) })).not.toThrow();
    });

    it.each(LENGTH_LIMITS)(
      'rejects $field longer than the maximum length of $limit',
      ({ field, limit }) => {
        expect(() => queryValidator.validate({ [field]: 'a'.repeat(limit + 1) })).toThrow(
          new RegExp(`maximum length of \\[${limit}\\]`)
        );
      }
    );

    it('accepts sourceFilters at the maximum length of 64 (valid tokens only)', () => {
      const sourceFilters = `${'live,'.repeat(12)}live`;
      expect(sourceFilters).toHaveLength(64);

      expect(() => queryValidator.validate({ sourceFilters })).not.toThrow();
    });

    it('rejects sourceFilters longer than the maximum length of 64 (valid tokens only)', () => {
      const sourceFilters = 'live,'.repeat(13);
      expect(sourceFilters).toHaveLength(65);

      expect(() => queryValidator.validate({ sourceFilters })).toThrow(/maximum length of \[64\]/);
    });
  });

  describe('when CPS is enabled', () => {
    beforeEach(() => {
      mockOsqueryContext = {
        ...mockOsqueryContext,
        isCpsActive: jest.fn().mockResolvedValue(true),
      } as unknown as OsqueryAppContext;

      mockScopedEsClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce(emptyScheduledAggregations);
    });

    it('runs both parallel history searches on the scoped client', async () => {
      setupRoute();

      await routeHandler(
        {} as never,
        httpServerMock.createKibanaRequest({ query: {} }),
        httpServerMock.createResponseFactory()
      );

      expect(mockScopedEsClient.search).toHaveBeenCalledTimes(2);
      expect(mockEsClient.search).not.toHaveBeenCalled();

      const actionsCall = mockScopedEsClient.search.mock.calls[0][0];
      const scheduledCall = mockScopedEsClient.search.mock.calls[1][0];

      expect(actionsCall.index).toContain(ACTIONS_INDEX);
      expect(scheduledCall.index).toContain(ACTION_RESPONSES_DATA_STREAM_INDEX);

      const scheduledFilters = scheduledCall.body.query.bool.filter as unknown[];
      expect(scheduledFilters).toContainEqual({ term: { space_id: 'default' } });
      expect(
        scheduledFilters.some(
          (filter) =>
            JSON.stringify(filter).includes('must_not') &&
            JSON.stringify(filter).includes('space_id')
        )
      ).toBe(false);
    });

    it('does not probe or add CCS remote patterns for the fanned-out reads', async () => {
      setupRoute();

      await routeHandler(
        {} as never,
        httpServerMock.createKibanaRequest({ query: {} }),
        httpServerMock.createResponseFactory()
      );

      expect(hasConnectedRemoteClusters).not.toHaveBeenCalled();
      expect(prefixIndexPatternsWithCcs).toHaveBeenCalledWith(`${ACTIONS_INDEX}*`, false);
    });
  });

  describe('when CPS is disabled', () => {
    beforeEach(() => {
      mockEsClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce(emptyScheduledAggregations);
    });

    it('runs both parallel history searches on the internal client', async () => {
      setupRoute();

      await routeHandler(
        {} as never,
        httpServerMock.createKibanaRequest({ query: {} }),
        httpServerMock.createResponseFactory()
      );

      expect(mockEsClient.search).toHaveBeenCalledTimes(2);
      expect(mockScopedEsClient.search).not.toHaveBeenCalled();
    });

    it('adds CCS remote patterns when remote clusters are connected', async () => {
      (hasConnectedRemoteClusters as jest.Mock).mockResolvedValueOnce(true);
      setupRoute();

      await routeHandler(
        {} as never,
        httpServerMock.createKibanaRequest({ query: {} }),
        httpServerMock.createResponseFactory()
      );

      expect(prefixIndexPatternsWithCcs).toHaveBeenCalledWith(`${ACTIONS_INDEX}*`, true);
    });
  });

  describe('when no linked projects are visible to the principal', () => {
    it('uses the internal ES client and never scopes the cluster client', async () => {
      const asScoped = jest.fn();
      mockOsqueryContext.getStartServices = jest.fn().mockResolvedValue([
        {
          elasticsearch: {
            client: {
              asInternalUser: mockEsClient,
              asScoped,
            },
          },
        },
      ]);
      mockEsClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockResolvedValueOnce(emptyScheduledAggregations);

      setupRoute();

      await routeHandler(
        {} as never,
        httpServerMock.createKibanaRequest({ query: {} }),
        httpServerMock.createResponseFactory()
      );

      expect(mockOsqueryContext.isCpsActive).toHaveBeenCalled();
      expect(mockEsClient.search).toHaveBeenCalled();
      expect(asScoped).not.toHaveBeenCalled();
    });
  });

  describe('scheduled-search error handling', () => {
    const callRoute = async () => {
      setupRoute();
      const mockResponse = httpServerMock.createResponseFactory();
      await routeHandler(
        {} as never,
        httpServerMock.createKibanaRequest({ query: {} }),
        mockResponse
      );

      return mockResponse;
    };

    const esError = (message: string, statusCode: number) =>
      Object.assign(new Error(message), { statusCode });

    it('degrades to empty scheduled results on a mapping failure', async () => {
      mockEsClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockRejectedValueOnce(esError('illegal_argument_exception', 400));

      const mockResponse = await callRoute();

      expect(mockResponse.ok).toHaveBeenCalled();
      expect(mockResponse.customError).not.toHaveBeenCalled();
    });

    it('surfaces an authorization failure instead of reporting empty history', async () => {
      mockEsClient.search
        .mockResolvedValueOnce({ hits: { hits: [] } })
        .mockRejectedValueOnce(esError('security_exception', 403));

      const mockResponse = await callRoute();

      expect(mockResponse.ok).not.toHaveBeenCalled();
      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });

    it('propagates the status code of a failing live-actions search', async () => {
      mockEsClient.search
        .mockRejectedValueOnce(esError('security_exception', 403))
        .mockResolvedValueOnce(emptyScheduledAggregations);

      const mockResponse = await callRoute();

      expect(mockResponse.customError).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403 })
      );
    });
  });
});
