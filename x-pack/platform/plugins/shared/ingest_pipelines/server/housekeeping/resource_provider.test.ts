/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsClientMock,
} from '@kbn/core/server/mocks';
import type { HousekeepingContext } from '@kbn/housekeeping-plugin/server';
import { createPipelineResourceProvider, getProcessorReferences } from './resource_provider';

const createContext = (isServerless = false) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const context: HousekeepingContext = {
    esClient,
    savedObjectsClient: savedObjectsClientMock.create(),
    isServerless,
    abortSignal: new AbortController().signal,
    logger: loggingSystemMock.createLogger(),
    fetchOnce: (_key, fetch) => fetch(new AbortController().signal),
  };
  return { esClient, context };
};

describe('getProcessorReferences', () => {
  it('finds called pipelines and enrich policies, including nested processors', () => {
    expect(
      getProcessorReferences([
        { pipeline: { name: 'a' } },
        { set: { field: 'x', value: 1, on_failure: [{ pipeline: { name: 'b' } }] } },
        { foreach: { field: 'items', processor: { enrich: { policy_name: 'users' } } } },
        { pipeline: { name: '{{ target }}' } },
        { pipeline: { name: 'global@custom', ignore_missing_pipeline: true } },
      ])
    ).toEqual([
      { targetType: 'ingest_pipeline', name: 'a', optional: false },
      { targetType: 'ingest_pipeline', name: 'b', optional: false },
      { targetType: 'enrich_policy', name: 'users', optional: false },
      { targetType: 'ingest_pipeline', name: 'global@custom', optional: true },
    ]);
  });
});

const DAY_MS = 24 * 60 * 60 * 1000;

const mockNodeStats = (
  esClient: HousekeepingContext['esClient'],
  nodes: Record<string, { roles?: string[]; uptimeDays: number; counts?: Record<string, number> }>
) =>
  (esClient.nodes.stats as jest.Mock).mockResolvedValue({
    nodes: Object.fromEntries(
      Object.entries(nodes).map(([id, { roles, uptimeDays, counts = {} }]) => [
        id,
        {
          roles,
          jvm: { uptime_in_millis: uptimeDays * DAY_MS },
          ingest: {
            pipelines: Object.fromEntries(
              Object.entries(counts).map(([name, count]) => [name, { count }])
            ),
          },
        },
      ])
    ),
  });

const provider = createPipelineResourceProvider({ unusedAfterDays: 7 });

describe('ingest pipelines resource provider', () => {
  it('lists pipelines with their calls and the documents processed while the ingest nodes ran', async () => {
    const { esClient, context } = createContext();
    esClient.ingest.getPipeline.mockResolvedValue({
      parent: { processors: [{ pipeline: { name: 'child' } }] },
      child: { processors: [], _meta: { managed: true } },
    });
    mockNodeStats(esClient, {
      a: { roles: ['ingest'], uptimeDays: 40, counts: { parent: 3 } },
      b: { roles: ['ingest'], uptimeDays: 12, counts: { parent: 2 } },
      // Not an ingest node, so its uptime does not limit the window.
      c: { roles: ['master'], uptimeDays: 1 },
    });

    expect(await provider.listResources(context)).toEqual([
      expect.objectContaining({
        id: 'parent',
        isManaged: false,
        inUse: true,
        evidence: { processedDocuments: 5, observedDays: 12 },
        references: [expect.objectContaining({ targetType: 'ingest_pipeline', targetId: 'child' })],
      }),
      expect.objectContaining({
        id: 'child',
        isManaged: true,
        inUse: false,
        details: ['No documents in the last 12 days'],
        evidence: { processedDocuments: 0, observedDays: 12 },
        references: [],
      }),
    ]);
  });

  it('does not judge unused pipelines when the ingest nodes started recently', async () => {
    const { esClient, context } = createContext();
    esClient.ingest.getPipeline.mockResolvedValue({ orphan: { processors: [] } });
    mockNodeStats(esClient, { a: { roles: ['ingest'], uptimeDays: 2 } });

    expect(await provider.listResources(context)).toEqual({
      resources: [expect.objectContaining({ id: 'orphan', inUse: false })],
      unusedNotChecked: [
        {
          type: 'ingest_pipeline',
          reason:
            'The ingest nodes started 2 days ago. Unused pipelines are reported after 7 days without documents.',
        },
      ],
    });
  });

  it('does not judge unused pipelines without node stats', async () => {
    const { esClient, context } = createContext(true);
    esClient.ingest.getPipeline.mockResolvedValue({ orphan: { processors: [] } });

    const result = await provider.listResources(context);

    expect(esClient.nodes.stats).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        unusedNotChecked: [expect.objectContaining({ type: 'ingest_pipeline' })],
      })
    );
  });
});
