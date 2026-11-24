/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { SystemEventsWriter } from './system_events_writer';
import { summarizeExtractionRuns } from './summarize_runs';

const STATS_COLUMNS = [
  'runs',
  'failures',
  'aborted',
  'entities',
  'logs_processed',
  'cap_applied_runs',
  'duration_p50_ms',
  'duration_p95_ms',
  'duration_max_ms',
  'entity_store.entity_type',
  'entity_store.mode',
].map((name) => ({ name, type: 'keyword' }));

const esqlResponse = (columns: Array<{ name: string }>, values: unknown[][]) =>
  ({ columns, values } as never);

describe('summarizeExtractionRuns', () => {
  const now = new Date('2026-11-17T10:00:00.000Z');
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let writeEvent: jest.Mock;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.indices.exists.mockResolvedValue(true);
    writeEvent = jest.fn().mockResolvedValue(true);
  });

  const run = () =>
    summarizeExtractionRuns({
      esClient,
      writer: { writeEvent } as unknown as SystemEventsWriter,
      namespace: 'default',
      logger: loggerMock.create(),
      now,
    });

  it('writes one summary per type and mode for each of the last 3 complete UTC days', async () => {
    esClient.esql.query.mockResolvedValue(
      esqlResponse(STATS_COLUMNS, [[1440, 0, 0, 900, 50000, 0, 1200, 3400, 9000, 'host', 'single']])
    );

    const { written } = await run();

    expect(written).toBe(3);
    expect(writeEvent.mock.calls.map(([, id]) => id)).toEqual([
      '2026-11-14:extraction:host:single',
      '2026-11-15:extraction:host:single',
      '2026-11-16:extraction:host:single',
    ]);
    expect(writeEvent.mock.calls[2][0]).toMatchObject({
      '@timestamp': '2026-11-16T00:00:00.000Z',
      event: { kind: 'summary', action: 'extraction' },
      entity_store: {
        entity_type: 'host',
        mode: 'single',
        summary: { runs: 1440, entities: 900, duration_p95_ms: 3400 },
      },
    });
  });

  it('adds the latest error to keys with failures', async () => {
    esClient.esql.query.mockImplementation(async ({ query }) =>
      query.includes('STATS')
        ? esqlResponse(STATS_COLUMNS, [[10, 2, 1, 0, 0, 0, 1, 2, 3, 'user', 'priority']])
        : esqlResponse(
            [
              { name: 'entity_store.entity_type' },
              { name: 'entity_store.mode' },
              { name: 'error.message' },
            ],
            [
              ['user', 'priority', 'newest'],
              ['user', 'priority', 'older'],
            ]
          )
    );

    await run();

    expect(writeEvent.mock.calls[0][0].entity_store.summary).toMatchObject({
      failures: 2,
      aborted: 1,
      last_error: 'newest',
    });
  });

  it('counts only new summaries', async () => {
    esClient.esql.query.mockResolvedValue(
      esqlResponse(STATS_COLUMNS, [[1, 0, 0, 0, 0, 0, 1, 1, 1, 'host', 'single']])
    );
    writeEvent.mockResolvedValue(false);

    await expect(run()).resolves.toEqual({ written: 0 });
  });

  it('does nothing when the extraction_runs stream does not exist', async () => {
    esClient.indices.exists.mockResolvedValue(false);

    await expect(run()).resolves.toEqual({ written: 0 });
    expect(esClient.esql.query).not.toHaveBeenCalled();
  });
});
