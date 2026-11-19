/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { lastValueFrom, of, throwError } from 'rxjs';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import type { IEsSearchRequest, IEsSearchResponse } from '@kbn/search-types';
import type { ISearchStrategy, SearchStrategyDependencies } from '@kbn/data-plugin/server';
import { createSearchSessionsClientMock } from '@kbn/data-plugin/server/search/mocks';
import { createResolvedLogViewLazyMock } from '../../../common/log_views/resolved_log_view.mock';
import {
  LOG_ENTRIES_MAX_COLUMNS,
  LOG_ENTRIES_MAX_SIZE,
} from '../../../common/search_strategies/log_entries/log_entries';
import { createLogViewsClientMock } from '../log_views/log_views_client.mock';
import { createLogViewsServiceStartMock } from '../log_views/log_views_service.mock';
import {
  logEntriesSearchRequestStateRT,
  logEntriesSearchStrategyProvider,
} from './log_entries_search_strategy';

describe('LogEntries search strategy', () => {
  it('handles initial search requests', async () => {
    const esSearchStrategyMock = createEsSearchStrategyMock({
      id: 'ASYNC_REQUEST_ID',
      isRunning: true,
      rawResponse: {
        took: 0,
        _shards: { total: 1, failed: 0, skipped: 0, successful: 0 },
        timed_out: false,
        hits: { total: 0, max_score: 0, hits: [] },
      },
    });

    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewLazyMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });

    const response = await lastValueFrom(
      logEntriesSearchStrategy.search(
        {
          params: {
            logView: { type: 'log-view-reference', logViewId: 'SOURCE_ID' },
            startTimestamp: 100,
            endTimestamp: 200,
            size: 3,
          },
        },
        {},
        mockDependencies
      )
    );

    expect(logViewsMock.getScopedClient).toHaveBeenCalled();
    expect(logViewsClientMock.getResolvedLogView).toHaveBeenCalled();
    expect(esSearchStrategyMock.search).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          index: 'log-indices-*',
          fields: expect.arrayContaining(['event.dataset', 'message']),
          runtime_mappings: {
            runtime_field: {
              type: 'keyword',
              script: {
                source: 'emit("runtime value")',
              },
            },
          },
        }),
      }),
      expect.anything(),
      expect.anything()
    );
    expect(response.id).toEqual(expect.any(String));
    expect(response.isRunning).toBe(true);
  });

  it('handles subsequent polling requests', async () => {
    const date = new Date(1605116827143).toISOString();
    const esSearchStrategyMock = createEsSearchStrategyMock({
      id: 'ASYNC_REQUEST_ID',
      isRunning: false,
      rawResponse: {
        took: 1,
        _shards: { total: 1, failed: 0, skipped: 0, successful: 1 },
        timed_out: false,
        hits: {
          total: 0,
          max_score: 0,
          hits: [
            {
              _id: 'HIT_ID',
              _index: 'HIT_INDEX',
              _score: 0,
              _source: null,
              fields: {
                '@timestamp': [date],
                'event.dataset': ['HIT_DATASET'],
                message: ['HIT_MESSAGE'],
                'container.id': ['HIT_CONTAINER_ID'],
              },
              sort: [date as any, 1 as any], // incorrectly typed as string upstream
            },
          ],
        },
      },
    });
    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewLazyMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });
    const requestId = logEntriesSearchRequestStateRT.encode({
      esRequestId: 'ASYNC_REQUEST_ID',
    });

    const response = await lastValueFrom(
      logEntriesSearchStrategy.search(
        {
          id: requestId,
          params: {
            logView: { type: 'log-view-reference', logViewId: 'SOURCE_ID' },
            startTimestamp: 100,
            endTimestamp: 200,
            size: 3,
          },
        },
        {},
        mockDependencies
      )
    );

    expect(logViewsMock.getScopedClient).toHaveBeenCalled();
    expect(logViewsClientMock.getResolvedLogView).toHaveBeenCalled();
    expect(esSearchStrategyMock.search).toHaveBeenCalled();
    expect(response.id).toEqual(requestId);
    expect(response.isRunning).toBe(false);
    expect(response.rawResponse.data.entries).toEqual([
      {
        id: 'HIT_ID',
        index: 'HIT_INDEX',
        cursor: {
          time: date,
          tiebreaker: 1,
        },
        columns: [
          {
            columnId: 'TIMESTAMP_COLUMN_ID',
            time: date,
          },
          {
            columnId: 'DATASET_COLUMN_ID',
            field: 'event.dataset',
            value: ['HIT_DATASET'],
            highlights: [],
          },
          {
            columnId: 'MESSAGE_COLUMN_ID',
            message: [
              {
                field: 'message',
                value: ['HIT_MESSAGE'],
                highlights: [],
              },
            ],
          },
        ],
        context: {
          'container.id': 'HIT_CONTAINER_ID',
        },
      },
    ]);
  });

  it('forwards errors from the underlying search strategy', async () => {
    const esSearchStrategyMock = createEsSearchStrategyMock({
      id: 'ASYNC_REQUEST_ID',
      isRunning: false,
      rawResponse: {
        took: 1,
        _shards: { total: 1, failed: 0, skipped: 0, successful: 1 },
        timed_out: false,
        hits: { total: 0, max_score: 0, hits: [] },
      },
    });
    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewLazyMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);
    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });

    const response = logEntriesSearchStrategy.search(
      {
        id: logEntriesSearchRequestStateRT.encode({ esRequestId: 'UNKNOWN_ID' }),
        params: {
          logView: { type: 'log-view-reference', logViewId: 'SOURCE_ID' },
          startTimestamp: 100,
          endTimestamp: 200,
          size: 3,
        },
      },
      {},
      mockDependencies
    );

    await expect(response.toPromise()).rejects.toThrow(errors.ResponseError);
  });

  describe('request bounds', () => {
    const setup = (resolvedLogView = createResolvedLogViewLazyMock()) => {
      const esSearchStrategyMock = createEsSearchStrategyMock({
        id: 'ASYNC_REQUEST_ID',
        isRunning: false,
        rawResponse: {
          took: 1,
          _shards: { total: 1, failed: 0, skipped: 0, successful: 1 },
          timed_out: false,
          hits: { total: 0, max_score: 0, hits: [] },
        },
      });
      const logViewsClientMock = createLogViewsClientMock();
      logViewsClientMock.getResolvedLogView.mockResolvedValue(resolvedLogView);
      const logViewsMock = createLogViewsServiceStartMock();
      logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);

      const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
        data: createDataPluginMock(esSearchStrategyMock),
        logViews: logViewsMock,
      });

      return { esSearchStrategyMock, logEntriesSearchStrategy };
    };

    const baseParams = {
      logView: { type: 'log-view-reference' as const, logViewId: 'SOURCE_ID' },
      startTimestamp: 100,
      endTimestamp: 200,
      size: 3,
    };

    const tooManyColumns = Array.from({ length: LOG_ENTRIES_MAX_COLUMNS + 1 }, () => ({
      messageColumn: { id: 'MESSAGE_COLUMN_ID' },
    }));

    it.each([0, LOG_ENTRIES_MAX_SIZE + 1])('rejects a size of %d', async (size) => {
      const { esSearchStrategyMock, logEntriesSearchStrategy } = setup();

      await expect(
        lastValueFrom(
          logEntriesSearchStrategy.search(
            { params: { ...baseParams, size } },
            {},
            createSearchStrategyDependenciesMock()
          )
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('Failed to validate'),
      });
      expect(esSearchStrategyMock.search).not.toHaveBeenCalled();
    });

    it('rejects requests with more columns than allowed', async () => {
      const { esSearchStrategyMock, logEntriesSearchStrategy } = setup();

      await expect(
        lastValueFrom(
          logEntriesSearchStrategy.search(
            { params: { ...baseParams, columns: tooManyColumns } },
            {},
            createSearchStrategyDependenciesMock()
          )
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining(`Expected at most ${LOG_ENTRIES_MAX_COLUMNS} columns`),
      });
      expect(esSearchStrategyMock.search).not.toHaveBeenCalled();
    });

    it('rejects inline log views with more columns than allowed', async () => {
      const { esSearchStrategyMock, logEntriesSearchStrategy } = setup();

      await expect(
        lastValueFrom(
          logEntriesSearchStrategy.search(
            {
              params: {
                ...baseParams,
                logView: {
                  type: 'log-view-inline',
                  id: 'INLINE_LOG_VIEW_ID',
                  attributes: {
                    name: 'INLINE LOG VIEW',
                    description: '',
                    logIndices: { type: 'index_name', indexName: 'log-indices-*' },
                    logColumns: tooManyColumns,
                  },
                },
              },
            },
            {},
            createSearchStrategyDependenciesMock()
          )
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining(`Expected at most ${LOG_ENTRIES_MAX_COLUMNS} columns`),
      });
      expect(esSearchStrategyMock.search).not.toHaveBeenCalled();
    });

    it('accepts persisted log views with more columns than the request limit', async () => {
      const { esSearchStrategyMock, logEntriesSearchStrategy } = setup(
        createResolvedLogViewLazyMock({ columns: tooManyColumns })
      );

      await lastValueFrom(
        logEntriesSearchStrategy.search(
          { params: baseParams },
          {},
          createSearchStrategyDependenciesMock()
        )
      );

      expect(esSearchStrategyMock.search).toHaveBeenCalled();
    });

    it('rejects polling requests with more columns than allowed', async () => {
      const { esSearchStrategyMock, logEntriesSearchStrategy } = setup();

      await expect(
        lastValueFrom(
          logEntriesSearchStrategy.search(
            {
              id: logEntriesSearchRequestStateRT.encode({ esRequestId: 'ASYNC_REQUEST_ID' }),
              params: { ...baseParams, columns: tooManyColumns },
            },
            {},
            createSearchStrategyDependenciesMock()
          )
        )
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining(`Expected at most ${LOG_ENTRIES_MAX_COLUMNS} columns`),
      });
      expect(esSearchStrategyMock.search).not.toHaveBeenCalled();
    });

    it('accepts requests at the limits', async () => {
      const { esSearchStrategyMock, logEntriesSearchStrategy } = setup();

      await lastValueFrom(
        logEntriesSearchStrategy.search(
          {
            params: {
              ...baseParams,
              size: LOG_ENTRIES_MAX_SIZE,
              columns: tooManyColumns.slice(0, LOG_ENTRIES_MAX_COLUMNS),
            },
          },
          {},
          createSearchStrategyDependenciesMock()
        )
      );

      expect(esSearchStrategyMock.search).toHaveBeenCalled();
    });
  });

  it('forwards cancellation to the underlying search strategy', async () => {
    const esSearchStrategyMock = createEsSearchStrategyMock({
      id: 'ASYNC_REQUEST_ID',
      isRunning: false,
      rawResponse: {
        took: 1,
        _shards: { total: 1, failed: 0, skipped: 0, successful: 1 },
        timed_out: false,
        hits: { total: 0, max_score: 0, hits: [] },
      },
    });
    const dataMock = createDataPluginMock(esSearchStrategyMock);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewLazyMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);

    const mockDependencies = createSearchStrategyDependenciesMock();

    const logEntriesSearchStrategy = logEntriesSearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });
    const requestId = logEntriesSearchRequestStateRT.encode({
      esRequestId: 'ASYNC_REQUEST_ID',
    });

    await logEntriesSearchStrategy.cancel?.(requestId, {}, mockDependencies);

    expect(esSearchStrategyMock.cancel).toHaveBeenCalled();
  });
});

const createEsSearchStrategyMock = (esSearchResponse: IEsSearchResponse) => ({
  search: jest.fn((esSearchRequest: IEsSearchRequest) => {
    if (typeof esSearchRequest.id === 'string') {
      if (esSearchRequest.id === esSearchResponse.id) {
        return of(esSearchResponse);
      } else {
        return throwError(
          new errors.ResponseError({
            body: {},
            headers: {},
            meta: {} as any,
            statusCode: 404,
            warnings: [],
          })
        );
      }
    } else {
      return of(esSearchResponse);
    }
  }),
  cancel: jest.fn().mockResolvedValue(undefined),
});

const createSearchStrategyDependenciesMock = (): SearchStrategyDependencies => ({
  uiSettingsClient: uiSettingsServiceMock.createClient(),
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
  searchSessionsClient: createSearchSessionsClientMock(),
  request: httpServerMock.createKibanaRequest(),
  rollupsEnabled: true,
});

// using the official data mock from within x-pack doesn't type-check successfully,
// because the `licensing` plugin modifies the `RequestHandlerContext` core type.
const createDataPluginMock = (esSearchStrategyMock: ISearchStrategy): any => ({
  search: {
    getSearchStrategy: jest.fn().mockReturnValue(esSearchStrategyMock),
  },
});
