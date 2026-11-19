/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { ElasticsearchClient } from '@kbn/core/server';
import { ensureResolutionRunsDataStream } from '../../../../asset_manager/resolution_runs_data_stream';
import {
  buildFailureRecord,
  buildSuccessRecord,
  writeResolutionRunRecords,
} from './resolution_run_records';

jest.mock('../../../../asset_manager/resolution_runs_data_stream', () => ({
  ...jest.requireActual('../../../../asset_manager/resolution_runs_data_stream'),
  ensureResolutionRunsDataStream: jest.fn(),
}));

const NOW = Date.parse('2026-11-17T12:00:00Z');
const state = {
  lastProcessedTimestamp: null,
  lastRun: { resolutionsCreated: 3, skippedAmbiguousBuckets: 1, skippedOversizedBuckets: 2 },
};

describe('run records', () => {
  it('builds a success record with the counts of the run', () => {
    expect(buildSuccessRecord('email_exact_match', state, NOW)).toEqual({
      '@timestamp': '2026-11-17T12:00:00.000Z',
      rule: { id: 'email_exact_match', kind: 'managed' },
      event: { outcome: 'success' },
      resolution: {
        links_created: 3,
        skipped_ambiguous: 1,
        skipped_oversized: 2,
        skipped_noop: 0,
      },
    });
  });

  it('builds a failure record with the saved error and zero counts', () => {
    const record = buildFailureRecord(
      'entra_guid_bridge',
      { ...state, lastError: 'partial results' },
      NOW
    );

    expect(record.event.outcome).toBe('failure');
    expect(record.error).toEqual({ message: 'partial results' });
    expect(record.resolution.links_created).toBe(0);
  });

  it('builds a success record with zero counts when the rule saved none', () => {
    const record = buildSuccessRecord('x', { lastProcessedTimestamp: null, lastRun: null }, NOW);
    expect(record.resolution).toEqual({
      links_created: 0,
      skipped_ambiguous: 0,
      skipped_oversized: 0,
      skipped_noop: 0,
    });
  });
});

describe('writeResolutionRunRecords', () => {
  const record = buildSuccessRecord('email_exact_match', state, NOW);
  const createEsClient = (bulk: jest.Mock = jest.fn().mockResolvedValue({ errors: false })) =>
    ({ bulk } as unknown as jest.Mocked<ElasticsearchClient>);

  beforeEach(() => {
    jest.clearAllMocks();
    (ensureResolutionRunsDataStream as jest.Mock).mockResolvedValue(undefined);
  });

  it('writes nothing when there are no records', async () => {
    const esClient = createEsClient();
    await writeResolutionRunRecords({
      esClient,
      namespace: 'default',
      logger: loggerMock.create(),
      records: [],
    });

    expect(ensureResolutionRunsDataStream).not.toHaveBeenCalled();
    expect(esClient.bulk).not.toHaveBeenCalled();
  });

  it('makes sure the stream exists, then writes every record in one bulk request', async () => {
    const order: string[] = [];
    (ensureResolutionRunsDataStream as jest.Mock).mockImplementation(async () => {
      order.push('ensure');
    });
    const bulk = jest.fn().mockImplementation(async () => {
      order.push('bulk');
      return { errors: false };
    });

    await writeResolutionRunRecords({
      esClient: createEsClient(bulk),
      namespace: 'default',
      logger: loggerMock.create(),
      records: [record, record],
    });

    expect(order).toEqual(['ensure', 'bulk']);
    expect(bulk).toHaveBeenCalledTimes(1);
    expect(bulk.mock.calls[0][0].operations).toEqual([
      { create: { _index: '.entities.v2.resolution_runs.default' } },
      record,
      { create: { _index: '.entities.v2.resolution_runs.default' } },
      record,
    ]);
  });

  it('logs a warning and does not throw when the stream cannot be created', async () => {
    (ensureResolutionRunsDataStream as jest.Mock).mockRejectedValue(
      new Error('security_exception')
    );
    const logger = loggerMock.create();
    const esClient = createEsClient();

    await expect(
      writeResolutionRunRecords({ esClient, namespace: 'default', logger, records: [record] })
    ).resolves.toBeUndefined();

    expect(esClient.bulk).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('security_exception'));
  });

  it('logs a warning and does not throw when the bulk request fails', async () => {
    const logger = loggerMock.create();
    const esClient = createEsClient(jest.fn().mockRejectedValue(new Error('boom')));

    await expect(
      writeResolutionRunRecords({ esClient, namespace: 'default', logger, records: [record] })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });

  it('warns about records the bulk response rejected', async () => {
    const logger = loggerMock.create();
    const esClient = createEsClient(
      jest.fn().mockResolvedValue({
        errors: true,
        items: [{ create: { error: { type: 'x' } } }, { create: { status: 201 } }],
      })
    );

    await writeResolutionRunRecords({
      esClient,
      namespace: 'default',
      logger,
      records: [record, record],
    });

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('1 of 2'));
  });
});
