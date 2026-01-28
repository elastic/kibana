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
import { createRuleExecutionInput, createAlertEvents } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createStorageService } from '../../services/storage_service/storage_service.mock';

describe('StoreAlertsStep', () => {
  const createState = (
    alertEvents?: Array<{ id: string; doc: AlertEvent }>
  ): RulePipelineState => ({
    input: createRuleExecutionInput(),
    alertEvents,
  });

  it('stores alert events and continues execution', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockResolvedValue({
      items: [],
      errors: false,
      took: 1,
    });

    const step = new StoreAlertsStep(loggerService, storageService);
    const alertEvents = createAlertEvents();
    const state = createState(alertEvents);

    const result = await step.execute(state);

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.bulk).toHaveBeenCalledTimes(1);
  });

  it('calls the esClient correctly', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockResolvedValue({
      items: [],
      errors: false,
      took: 1,
    });

    const step = new StoreAlertsStep(loggerService, storageService);
    const state = createState(createAlertEvents());

    await step.execute(state);

    expect(mockEsClient.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        operations: expect.any(Array),
        refresh: 'wait_for',
      })
    );
  });

  it('passes docs with correct ids to storage service', async () => {
    const { loggerService } = createLoggerService();
    const { storageService, mockEsClient } = createStorageService();

    mockEsClient.bulk.mockResolvedValue({
      items: [
        { index: { _index: ALERT_EVENTS_DATA_STREAM, _id: 'alert-0', status: 201 } },
        { index: { _index: ALERT_EVENTS_DATA_STREAM, _id: 'alert-1', status: 201 } },
        { index: { _index: ALERT_EVENTS_DATA_STREAM, _id: 'alert-2', status: 201 } },
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
    expect(operations[0]).toEqual({ create: { _index: ALERT_EVENTS_DATA_STREAM, _id: 'alert-0' } });
    expect(operations[1]).toEqual(alertEvents[0].doc);
    expect(operations[2]).toEqual({ create: { _index: ALERT_EVENTS_DATA_STREAM, _id: 'alert-1' } });
    expect(operations[3]).toEqual(alertEvents[1].doc);
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
});
