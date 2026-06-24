/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { KnowledgeIndicatorClient } from '../streams/ki';
import type { StreamsKIsOnboardingClient } from '../workflows/onboarding_workflow_client';
import {
  emptySigEventsResetDeletedCounts,
  resetSignificantEvents,
} from './reset_stream_sig_events';

jest.mock('./delete_by_query_best_effort', () => ({
  deleteByQueryBestEffort: jest.fn().mockResolvedValue(0),
}));

import { deleteByQueryBestEffort } from './delete_by_query_best_effort';

const deleteByQueryBestEffortMock = deleteByQueryBestEffort as jest.MockedFunction<
  typeof deleteByQueryBestEffort
>;

const esClient = {} as ElasticsearchClient;

describe('resetSignificantEvents', () => {
  const logger = loggerMock.create();
  const request = httpServerMock.createKibanaRequest();

  beforeEach(() => {
    jest.clearAllMocks();
    deleteByQueryBestEffortMock.mockResolvedValue(0);
  });

  it('cancels onboarding, deletes KIs and rules per stream, then wipes v1 alerts', async () => {
    const kiClient = {
      getStreamNamesWithKnowledgeIndicators: jest
        .fn()
        .mockResolvedValue(['logs.nginx', 'logs.apache']),
      getStreamToQueryLinksMap: jest.fn().mockImplementation(async (names: string[]) => {
        const streamName = names[0];
        if (streamName === 'logs.nginx') {
          return {
            [streamName]: [
              {
                stream_name: streamName,
                rule_backed: true,
                rule_id: 'rule-a',
                query: { id: 'q-1' },
              },
            ],
          };
        }
        return { [streamName]: [] };
      }),
      getFeatures: jest.fn().mockResolvedValue({ hits: [{ id: 'f-1' }] }),
      deleteAllQueries: jest.fn().mockResolvedValue(undefined),
      deleteIndicators: jest.fn().mockResolvedValue(undefined),
    } as unknown as KnowledgeIndicatorClient;

    const streamsKIsOnboardingClient = {
      cancelAllRunning: jest.fn().mockResolvedValue(2),
    } as unknown as StreamsKIsOnboardingClient;

    deleteByQueryBestEffortMock.mockResolvedValueOnce(9);

    const result = await resetSignificantEvents({
      kiClient,
      esClient,
      logger,
      request,
      streamsKIsOnboardingClient,
    });

    expect(streamsKIsOnboardingClient.cancelAllRunning).toHaveBeenCalledWith({ request });
    expect(kiClient.deleteAllQueries).toHaveBeenCalledTimes(2);
    expect(kiClient.deleteIndicators).toHaveBeenCalledTimes(2);
    expect(deleteByQueryBestEffortMock).toHaveBeenCalledWith({
      esClient,
      index: '.alerts-streams.alerts-default',
      query: { match_all: {} },
    });

    expect(result).toEqual({
      streams: ['logs.nginx', 'logs.apache'],
      canceledOnboardingCount: 2,
      deleted: {
        queries: 1,
        features: 2,
        rules: 1,
        alertsV1: 9,
      },
      byStream: {
        'logs.nginx': {
          queries: 1,
          features: 1,
          rules: 1,
          alertsV1: 0,
        },
        'logs.apache': {
          queries: 0,
          features: 1,
          rules: 0,
          alertsV1: 0,
        },
      },
    });
  });

  it('still wipes v1 alerts when no knowledge indicators exist', async () => {
    const kiClient = {
      getStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
    } as unknown as KnowledgeIndicatorClient;

    const streamsKIsOnboardingClient = {
      cancelAllRunning: jest.fn().mockResolvedValue(0),
    } as unknown as StreamsKIsOnboardingClient;

    const result = await resetSignificantEvents({
      kiClient,
      esClient,
      logger,
      request,
      streamsKIsOnboardingClient,
    });

    expect(result.streams).toEqual([]);
    expect(result.deleted).toEqual(emptySigEventsResetDeletedCounts());
    expect(result.byStream).toEqual({});
    expect(deleteByQueryBestEffortMock).toHaveBeenCalledTimes(1);
  });
});
