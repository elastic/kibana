/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SystemEventsWriter, buildLifecycleDoc, buildRunDoc } from './system_events_writer';
import { resetEnsuredSystemEventsNamespaces } from './ensure_system_events_streams';
import { SYSTEM_EVENT_ACTION } from './types';

const EXTRACTION_RUNS = '.entities.v2.system.extraction_runs.default';
const EVENTS = '.entities.v2.system.events.default';

describe('SystemEventsWriter', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;
  let logger: MockedLogger;
  let writer: SystemEventsWriter;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
    logger = loggerMock.create();
    resetEnsuredSystemEventsNamespaces();
    esClient.indices.exists.mockResolvedValue(true);
    esClient.indices.getDataStream.mockImplementation(
      async ({ name } = {}) => ({ data_streams: name ? [{ name }] : [] } as never)
    );
    writer = new SystemEventsWriter({ esClient, logger, namespace: 'default' });
  });

  it('writes extraction runs to the extraction_runs stream', async () => {
    await writer.writeRun({
      action: SYSTEM_EVENT_ACTION.extraction,
      startedAt: 0,
      endedAt: 1500,
      outcome: 'success',
      trigger: 'task',
      entityType: 'host',
      mode: 'single',
    });

    expect(esClient.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index: EXTRACTION_RUNS,
        op_type: 'create',
        require_data_stream: true,
        document: expect.objectContaining({
          event: expect.objectContaining({ kind: 'run', duration: 1_500_000_000 }),
        }),
      })
    );
  });

  it('writes other runs to the events stream', async () => {
    await writer.writeRun({
      action: SYSTEM_EVENT_ACTION.maintainer,
      startedAt: 0,
      outcome: 'success',
      trigger: 'task',
      maintainerId: 'watchlist',
    });

    expect(esClient.index).toHaveBeenCalledWith(expect.objectContaining({ index: EVENTS }));
  });

  it('does not throw when the write fails', async () => {
    esClient.index.mockRejectedValue(new Error('boom'));

    await expect(writer.writeEvent(buildRunDoc('default', runInput()))).resolves.toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('treats a conflict on a doc with an id as already written', async () => {
    esClient.index.mockRejectedValue(
      Object.assign(new Error('conflict'), { meta: { statusCode: 409 } })
    );

    await expect(writer.writeEvent(buildRunDoc('default', runInput()), 'id')).resolves.toBe(false);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('skips the write when Entity Store is not installed', async () => {
    esClient.indices.exists.mockResolvedValue(false);

    await writer.writeRun(runInput());

    expect(esClient.indices.createDataStream).not.toHaveBeenCalled();
    expect(esClient.index).not.toHaveBeenCalled();
  });

  it('ensures the streams once per namespace', async () => {
    await writer.writeRun(runInput());
    await writer.writeRun(runInput());

    expect(esClient.indices.putIndexTemplate).toHaveBeenCalledTimes(2);
    expect(esClient.index).toHaveBeenCalledTimes(2);
  });
});

describe('buildRunDoc', () => {
  it('records a failure with its reason and a truncated error message', () => {
    const doc = buildRunDoc('default', {
      ...runInput(),
      outcome: 'failure',
      reason: 'aborted',
      error: new Error('x'.repeat(5000)),
    });

    expect(doc.event).toMatchObject({ outcome: 'failure', reason: 'aborted' });
    expect(doc.error?.message).toHaveLength(1000);
  });
});

const runInput = () => ({
  action: SYSTEM_EVENT_ACTION.historySnapshot,
  startedAt: Date.now(),
  outcome: 'success' as const,
  trigger: 'task' as const,
});

describe('buildLifecycleDoc', () => {
  it('records the action, target and error of a lifecycle change', () => {
    const doc = buildLifecycleDoc(
      'default',
      {
        action: 'start_process',
        outcome: 'failure',
        trigger: 'user',
        entityType: 'user',
        mode: 'nonPriority',
        error: new Error('forbidden'),
      },
      new Date('2026-11-17T00:00:00.000Z')
    );

    expect(doc).toEqual({
      '@timestamp': '2026-11-17T00:00:00.000Z',
      event: { kind: 'lifecycle', action: 'start_process', outcome: 'failure' },
      error: { message: 'forbidden' },
      entity_store: {
        namespace: 'default',
        trigger: 'user',
        entity_type: 'user',
        mode: 'nonPriority',
      },
    });
  });
});
