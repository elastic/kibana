/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeEsqlAlerts } from './write_alerts';

describe('writeEsqlAlerts', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('transforms ES|QL response rows into alert documents and bulk indexes them', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false });
    const esClient = { bulk } as any;

    const res = await writeEsqlAlerts({
      services: {
        logger: { debug: jest.fn() } as any,
        esClient,
        dataStreamName: '.alerts-events',
      },
      input: {
        ruleId: 'rule-123',
        spaceId: 'default',
        ruleAttributes: {
          name: 'My ES|QL Rule',
          tags: ['esql', 'test'],
          schedule: { custom: '1m' },
          enabled: true,
          query: 'FROM idx | STATS count = COUNT(*) BY host.name',
          timeField: '@timestamp',
          lookbackWindow: '5m',
          groupingKey: ['host.name'],
          scheduledTaskId: null,
          createdBy: 'u',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedBy: 'u',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
        esqlResponse: {
          columns: [{ name: 'host.name' }, { name: 'count' }],
          values: [
            ['host-a', 10],
            ['host-b', 5],
          ],
        } as any,
        scheduledTimestamp: '2024-12-31T23:59:00.000Z',
      },
    });

    expect(res).toEqual({ created: 2 });
    expect(bulk).toHaveBeenCalledTimes(1);

    const bulkArgs = bulk.mock.calls[0][0];
    expect(bulkArgs.index).toBe('.alerts-events');
    expect(bulkArgs.refresh).toBe(false);
    expect(bulkArgs.operations).toHaveLength(4);

    const [op1, doc1, op2, doc2] = bulkArgs.operations;
    expect(op1.create._index).toBe('.alerts-events');
    expect(op2.create._index).toBe('.alerts-events');

    expect(doc1['@timestamp']).toBe('2025-01-01T00:00:00.000Z');
    expect(doc1.scheduled_timestamp).toBe('2024-12-31T23:59:00.000Z');
    expect(doc1.tags).toEqual(['esql', 'test']);
    expect(doc1.rule).toEqual({ id: 'rule-123', tags: ['esql', 'test'] });
    expect(doc1.grouping).toEqual({ key: 'host.name', value: 'host-a' });
    expect(doc1.data).toEqual({ 'host.name': 'host-a', count: 10 });
    expect(doc1.status).toBe('breach');
    expect(doc1.source).toBe('internal');
    expect(doc1.alert_series_id).toEqual(expect.any(String));

    expect(doc2.grouping).toEqual({ key: 'host.name', value: 'host-b' });
    expect(doc2.data).toEqual({ 'host.name': 'host-b', count: 5 });
  });
});
