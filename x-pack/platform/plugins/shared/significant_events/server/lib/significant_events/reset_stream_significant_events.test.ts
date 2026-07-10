/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { KnowledgeIndicatorClient } from '../knowledge_indicators';
import type { SignificantEventsKIsOnboardingClient } from '../workflows/onboarding_workflow_client';
import {
  emptySignificantEventsResetDeletedCounts,
  resetSignificantEvents,
} from './reset_stream_significant_events';

describe('resetSignificantEvents', () => {
  const logger = loggerMock.create();
  const request = httpServerMock.createKibanaRequest();
  let esClient: ElasticsearchClient;

  beforeEach(() => {
    esClient = {
      deleteByQuery: jest.fn().mockResolvedValue({ deleted: 0 }),
    } as unknown as ElasticsearchClient;
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
    } as unknown as SignificantEventsKIsOnboardingClient;

    (esClient.deleteByQuery as jest.Mock).mockResolvedValueOnce({ deleted: 9 });

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
    // Query count must mirror `deleteAllQueries`, which deletes expired queries too.
    expect(kiClient.getStreamToQueryLinksMap).toHaveBeenCalledWith(expect.any(Array), {
      includeExpired: true,
    });
    // Feature count must mirror `deleteIndicators`, which deletes excluded/expired features too.
    expect(kiClient.getFeatures).toHaveBeenCalledWith(expect.any(String), {
      includeExcluded: true,
      includeExpired: true,
    });
    expect(esClient.deleteByQuery).toHaveBeenCalledWith(
      {
        index: '.alerts-streams.alerts-default',
        conflicts: 'proceed',
        query: { match_all: {} },
      },
      { ignore: [404] }
    );

    expect(result).toEqual({
      streams: ['logs.nginx', 'logs.apache'],
      canceled_onboarding_count: 2,
      deleted: {
        queries: 1,
        features: 2,
        rules: 1,
        alerts_v1: 9,
      },
      by_stream: {
        'logs.nginx': {
          queries: 1,
          features: 1,
          rules: 1,
          alerts_v1: 0,
        },
        'logs.apache': {
          queries: 0,
          features: 1,
          rules: 0,
          alerts_v1: 0,
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
    } as unknown as SignificantEventsKIsOnboardingClient;

    const result = await resetSignificantEvents({
      kiClient,
      esClient,
      logger,
      request,
      streamsKIsOnboardingClient,
    });

    expect(result.streams).toEqual([]);
    expect(result.deleted).toEqual(emptySignificantEventsResetDeletedCounts());
    expect(result.by_stream).toEqual({});
    expect(esClient.deleteByQuery).toHaveBeenCalledTimes(1);
  });

  it('wipes v1 alerts cluster-wide (all spaces, no kibana.space_ids filter) by design', async () => {
    const kiClient = {
      getStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
    } as unknown as KnowledgeIndicatorClient;

    const streamsKIsOnboardingClient = {
      cancelAllRunning: jest.fn().mockResolvedValue(0),
    } as unknown as SignificantEventsKIsOnboardingClient;

    await resetSignificantEvents({
      kiClient,
      esClient,
      logger,
      request,
      streamsKIsOnboardingClient,
    });

    // The reset is a cluster-level alerting-v1 -> v2 migration tool: it must delete alerts
    // across every space, so the query is match_all with no `kibana.space_ids` scoping.
    const [deleteArgs] = (esClient.deleteByQuery as jest.Mock).mock.calls[0];
    expect(deleteArgs.query).toEqual({ match_all: {} });
    expect(JSON.stringify(deleteArgs)).not.toContain('kibana.space_ids');
  });

  it('reports zero v1 alerts deleted when the alerts index is missing', async () => {
    const kiClient = {
      getStreamNamesWithKnowledgeIndicators: jest.fn().mockResolvedValue([]),
    } as unknown as KnowledgeIndicatorClient;

    const streamsKIsOnboardingClient = {
      cancelAllRunning: jest.fn().mockResolvedValue(0),
    } as unknown as SignificantEventsKIsOnboardingClient;

    (esClient.deleteByQuery as jest.Mock).mockResolvedValueOnce({});

    const result = await resetSignificantEvents({
      kiClient,
      esClient,
      logger,
      request,
      streamsKIsOnboardingClient,
    });

    expect(result.deleted.alerts_v1).toBe(0);
  });
});
