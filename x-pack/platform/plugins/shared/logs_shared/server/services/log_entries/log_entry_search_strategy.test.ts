/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors, TransportResult } from '@elastic/elasticsearch';
import { AsyncSearchSubmitResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import {
  elasticsearchServiceMock,
  httpServerMock,
  savedObjectsClientMock,
  uiSettingsServiceMock,
} from '@kbn/core/server/mocks';
import { getMockSearchConfig } from '@kbn/data-plugin/config.mock';
import { ISearchStrategy } from '@kbn/data-plugin/server';
import { enhancedEsSearchStrategyProvider } from '@kbn/data-plugin/server/search';
import { createSearchSessionsClientMock } from '@kbn/data-plugin/server/search/mocks';
import { KbnSearchError } from '@kbn/data-plugin/server/search/report_search_error';
import { loggerMock } from '@kbn/logging-mocks';
import { EMPTY, lastValueFrom } from 'rxjs';
import { createResolvedLogViewMock } from '../../../common/log_views/resolved_log_view.mock';
import { createLogViewsClientMock } from '../log_views/log_views_client.mock';
import { createLogViewsServiceStartMock } from '../log_views/log_views_service.mock';
import {
  logEntrySearchRequestStateRT,
  logEntrySearchStrategyProvider,
} from './log_entry_search_strategy';

describe('LogEntry search strategy', () => {
  it('handles initial search requests', async () => {
    const esSearchStrategy = createEsSearchStrategy();
    const mockDependencies = createSearchStrategyDependenciesMock();
    const esClient = mockDependencies.esClient.asCurrentUser;
    esClient.asyncSearch.submit.mockResolvedValueOnce({
      body: {
        id: 'ASYNC_REQUEST_ID',
        response: {
          took: 0,
          _shards: { total: 1, failed: 0, skipped: 0, successful: 0 },
          timed_out: false,
          hits: { total: 0, max_score: 0, hits: [] },
        },
        is_partial: false,
        is_running: false,
        expiration_time_in_millis: 0,
        start_time_in_millis: 0,
      },
      statusCode: 200,
      headers: {
        'x-elasticsearch-async-id': 'ASYNC_REQUEST_ID',
        'x-elasticsearch-async-is-running': '?0',
        'x-elasticsearch-async-is-partial': '?0',
      },
      warnings: [],
      meta: {} as any,
    } as TransportResult<AsyncSearchSubmitResponse> as any); // type inference for the mock fails

    const dataMock = createDataPluginMock(esSearchStrategy);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);

    const logEntrySearchStrategy = logEntrySearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });

    const response = await lastValueFrom(
      logEntrySearchStrategy.search(
        {
          params: {
            logView: { type: 'log-view-reference', logViewId: 'SOURCE_ID' },
            logEntryId: 'LOG_ENTRY_ID',
          },
        },
        {},
        mockDependencies
      )
    );

    // ensure log view was resolved
    expect(logViewsMock.getScopedClient).toHaveBeenCalled();
    expect(logViewsClientMock.getResolvedLogView).toHaveBeenCalled();

    // ensure search request was made
    expect(esClient.asyncSearch.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'log-indices-*',
        body: expect.objectContaining({
          track_total_hits: false,
          terminate_after: 1,
          query: {
            ids: {
              values: ['LOG_ENTRY_ID'],
            },
          },
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
      expect.anything()
    );

    // ensure response content is as expected
    expect(response.id).toEqual(expect.any(String));
    expect(response.isRunning).toBe(false);
  });

  it('handles subsequent polling requests', async () => {
    const date = new Date(1605116827143).toISOString();
    const esSearchStrategy = createEsSearchStrategy();
    const mockDependencies = createSearchStrategyDependenciesMock();
    const esClient = mockDependencies.esClient.asCurrentUser;

    // set up response to polling request
    esClient.asyncSearch.get.mockResolvedValueOnce({
      body: {
        id: 'ASYNC_REQUEST_ID',
        response: {
          took: 0,
          _shards: { total: 1, failed: 0, skipped: 0, successful: 0 },
          timed_out: false,
          hits: {
            total: 1,
            max_score: 0,
            hits: [
              {
                _id: 'HIT_ID',
                _index: 'HIT_INDEX',
                _score: 0,
                _source: null,
                fields: {
                  '@timestamp': [date],
                  message: ['HIT_MESSAGE'],
                },
                sort: [date as any, 1 as any], // incorrectly typed as string upstream
              },
            ],
          },
        },
        is_partial: false,
        is_running: false,
        expiration_time_in_millis: 0,
        start_time_in_millis: 0,
      },
      statusCode: 200,
      headers: {
        'x-elasticsearch-async-id': 'ASYNC_REQUEST_ID',
        'x-elasticsearch-async-is-running': '?0',
        'x-elasticsearch-async-is-partial': '?0',
      },
      warnings: [],
      meta: {} as any,
    } as TransportResult<AsyncSearchSubmitResponse> as any);

    const dataMock = createDataPluginMock(esSearchStrategy);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);

    const logEntrySearchStrategy = logEntrySearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });
    const requestId = logEntrySearchRequestStateRT.encode({
      esRequestId: 'ASYNC_REQUEST_ID',
    });

    const response = await lastValueFrom(
      logEntrySearchStrategy.search(
        {
          id: requestId,
          params: {
            logView: { type: 'log-view-reference', logViewId: 'SOURCE_ID' },
            logEntryId: 'LOG_ENTRY_ID',
          },
        },
        {},
        mockDependencies
      )
    );

    // ensure search was polled using the get API
    expect(esClient.asyncSearch.get).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ASYNC_REQUEST_ID' }),
      expect.anything()
    );
    expect(esClient.asyncSearch.status).not.toHaveBeenCalled();

    // ensure log view was not resolved again
    expect(logViewsMock.getScopedClient).not.toHaveBeenCalled();
    expect(logViewsClientMock.getResolvedLogView).not.toHaveBeenCalled();

    // ensure response content is as expected
    expect(response.id).toEqual(requestId);
    expect(response.isRunning).toBe(false);
    expect(response.rawResponse.data).toEqual({
      id: 'HIT_ID',
      index: 'HIT_INDEX',
      cursor: {
        time: date,
        tiebreaker: 1,
      },
      fields: [
        { field: '@timestamp', value: [date] },
        { field: 'message', value: ['HIT_MESSAGE'] },
      ],
    });
  });

  it('forwards errors from the underlying search strategy', async () => {
    const esSearchStrategy = createEsSearchStrategy();
    const mockDependencies = createSearchStrategyDependenciesMock();
    const esClient = mockDependencies.esClient.asCurrentUser;

    // set up failing response
    esClient.asyncSearch.get.mockRejectedValueOnce(
      new errors.ResponseError({
        body: {
          error: {
            type: 'mock_error',
          },
        },
        headers: {},
        meta: {} as any,
        statusCode: 404,
        warnings: [],
      })
    );

    const dataMock = createDataPluginMock(esSearchStrategy);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);

    const logEntrySearchStrategy = logEntrySearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });

    const response = logEntrySearchStrategy.search(
      {
        id: logEntrySearchRequestStateRT.encode({ esRequestId: 'UNKNOWN_ID' }),
        params: {
          logView: { type: 'log-view-reference', logViewId: 'SOURCE_ID' },
          logEntryId: 'LOG_ENTRY_ID',
        },
      },
      {},
      mockDependencies
    );

    await expect(lastValueFrom(response)).rejects.toThrowError(KbnSearchError);
  });

  it('forwards cancellation to the underlying search strategy', async () => {
    const esSearchStrategy = createEsSearchStrategy();
    const mockDependencies = createSearchStrategyDependenciesMock();
    const esClient = mockDependencies.esClient.asCurrentUser;

    // set up response to cancellation request
    esClient.asyncSearch.delete.mockResolvedValueOnce({
      acknowledged: true,
    });

    const dataMock = createDataPluginMock(esSearchStrategy);
    const logViewsClientMock = createLogViewsClientMock();
    logViewsClientMock.getResolvedLogView.mockResolvedValue(createResolvedLogViewMock());
    const logViewsMock = createLogViewsServiceStartMock();
    logViewsMock.getScopedClient.mockReturnValue(logViewsClientMock);

    const logEntrySearchStrategy = logEntrySearchStrategyProvider({
      data: dataMock,
      logViews: logViewsMock,
    });
    const requestId = logEntrySearchRequestStateRT.encode({
      esRequestId: 'ASYNC_REQUEST_ID',
    });

    await logEntrySearchStrategy.cancel?.(requestId, {}, mockDependencies);

    // ensure cancellation request is forwarded
    expect(esClient.asyncSearch.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ASYNC_REQUEST_ID',
      })
    );
  });
});

const createEsSearchStrategy = () => {
  const legacyConfig$ = EMPTY;
  const searchConfig = getMockSearchConfig({});
  const logger = loggerMock.create();
  return enhancedEsSearchStrategyProvider(legacyConfig$, searchConfig, logger);
};

const createSearchStrategyDependenciesMock = () => ({
  uiSettingsClient: uiSettingsServiceMock.createClient(),
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: savedObjectsClientMock.create(),
  searchSessionsClient: createSearchSessionsClientMock(),
  request: httpServerMock.createKibanaRequest(),
});

// using the official data mock from within x-pack doesn't type-check successfully,
// because the `licensing` plugin modifies the `RequestHandlerContext` core type.
const createDataPluginMock = (esSearchStrategyMock: ISearchStrategy): any => ({
  search: {
    getSearchStrategy: jest.fn().mockReturnValue(esSearchStrategyMock),
  },
});
