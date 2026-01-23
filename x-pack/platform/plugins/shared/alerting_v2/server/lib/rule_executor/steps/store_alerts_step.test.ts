/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StoreAlertsStep } from './store_alerts_step';
import type { RulePipelineState } from '../types';
import type { AlertEvent } from '../../../resources/alert_events';
import { ALERT_EVENTS_DATA_STREAM } from '../../../resources/alert_events';
import { createStorageService, createRuleExecutionInput, createLoggerService } from '../../test_utils';

describe('StoreAlertsStep', () => {
  const createAlertEvents = (count: number = 2): Array<{ id: string; doc: AlertEvent }> => {
    return Array.from({ length: count }, (_, i) => ({
      id: `alert-${i}`,
      doc: {
        '@timestamp': '2025-01-01T00:00:00.000Z',
        scheduled_timestamp: '2025-01-01T00:00:00.000Z',
        rule: { id: 'rule-1', tags: [] },
        grouping: { key: 'host.name', value: `host-${i}` },
        data: { 'host.name': `host-${i}` },
        parent_rule_id: '',
        status: 'breach',
        alert_id: `alert-${i}`,
        alert_series_id: `series-${i}`,
        source: 'internal',
        tags: [],
      },
    }));
  };

  const createState = (
    alertEvents?: Array<{ id: string; doc: AlertEvent }>
  ): RulePipelineState => ({
    input: createRuleExecutionInput(),
    alertEvents,
  });

  it('stores alert events and continues execution', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockResolvedValue({
      items: [{ index: { _id: 'alert-0', status: 201 } }],
      errors: false,
      took: 1,
    });

    const step = new StoreAlertsStep(loggerService, storageService);
    const alertEvents = createAlertEvents(2);
    const state = createState(alertEvents);

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('uses correct data stream index', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockResolvedValue({
      items: [{ index: { _id: 'alert-0', status: 201 } }],
      errors: false,
      took: 1,
    });

    const step = new StoreAlertsStep(loggerService, storageService);
    const state = createState(createAlertEvents());

    await step.execute(state);

    expect(mockEsClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: expect.arrayContaining([
          expect.objectContaining({ index: expect.objectContaining({ _index: ALERT_EVENTS_DATA_STREAM }) }),
        ]),
      })
    );
  });

  it('passes docs with correct ids to storage service', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockResolvedValue({
      items: [
        { index: { _id: 'alert-0', status: 201 } },
        { index: { _id: 'alert-1', status: 201 } },
        { index: { _id: 'alert-2', status: 201 } },
      ],
      errors: false,
      took: 1,
    });

    const step = new StoreAlertsStep(loggerService, storageService);
    const alertEvents = createAlertEvents(3);
    const state = createState(alertEvents);

    await step.execute(state);

    const bulkCall = mockEsClient.bulk.mock.calls[0][0];
    expect(bulkCall).toBeDefined();

    // Verify each doc is indexed with its corresponding id
    const operations = bulkCall!.operations as Array<Record<string, unknown>>;
    expect(operations[0]).toEqual({ index: { _index: ALERT_EVENTS_DATA_STREAM, _id: 'alert-0' } });
    expect(operations[1]).toEqual(alertEvents[0].doc);
    expect(operations[2]).toEqual({ index: { _index: ALERT_EVENTS_DATA_STREAM, _id: 'alert-1' } });
    expect(operations[3]).toEqual(alertEvents[1].doc);
  });

  it('handles empty alert events array without calling bulk', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    const step = new StoreAlertsStep(loggerService, storageService);
    const state = createState([]);

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    // StorageService returns early for empty docs array
    expect(mockEsClient.bulk).not.toHaveBeenCalled();
  });

  it('throws when alertEvents is missing from state', async () => {
    const { loggerService } = createLoggerService();
    const { storageService } = createStorageService();

    const step = new StoreAlertsStep(loggerService, storageService);
    const state = createState(undefined);

    await expect(step.execute(state)).rejects.toThrow(
      'StoreAlertsStep requires alertEvents from previous step'
    );
  });

  it('propagates storage service errors', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockRejectedValue(new Error('Bulk index failed'));

    const step = new StoreAlertsStep(loggerService, storageService);
    const state = createState(createAlertEvents());

    await expect(step.execute(state)).rejects.toThrow('Bulk index failed');
  });

  it('logs debug message after storing', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockResolvedValue({
      items: [{ index: { _id: 'alert-0', status: 201 } }],
      errors: false,
      took: 1,
    });

    const step = new StoreAlertsStep(loggerService, storageService);
    const state = createState(createAlertEvents());

    await step.execute(state);

    expect(mockLogger.debug).toHaveBeenCalled();
  });

  it('has correct step name', () => {
    const { loggerService } = createLoggerService();
    const { storageService } = createStorageService();
    const step = new StoreAlertsStep(loggerService, storageService);

    expect(step.name).toBe('store_alerts');
  });
});
