/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HydrateAlertDataStep } from './hydrate_alert_data_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { createAlert, createDispatcherPipelineState } from '../fixtures/test_utils';
import { createAlertDataResponse } from '../fixtures/dispatcher';

describe('HydrateAlertDataStep', () => {
  it('is named hydrate_alert_data', () => {
    const { queryService } = createQueryService();

    expect(new HydrateAlertDataStep(queryService).name).toBe('hydrate_alert_data');
  });

  it('returns continue without querying when dispatchable is empty', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const state = createDispatcherPipelineState({ dispatchable: [] });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('returns continue without querying when dispatchable is absent', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('attaches data to the matching alert', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const alerts = [createAlert({ alert_id: 'ep-1', rule_id: 'r1' })];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertDataResponse([{ alert_id: 'ep-1', data_json: '{"host":"server-01","count":3}' }])
    );

    const state = createDispatcherPipelineState({ dispatchable: alerts });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toEqual({ host: 'server-01', count: 3 });
  });

  it('un-flattens dot-separated keys in data_json', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const alerts = [createAlert({ alert_id: 'ep-1' })];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertDataResponse([
        { alert_id: 'ep-1', data_json: '{"host.name":"srv-01","host.ip":"10.0.0.1"}' },
      ])
    );

    const state = createDispatcherPipelineState({ dispatchable: alerts });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toEqual({
      host: { name: 'srv-01', ip: '10.0.0.1' },
    });
  });

  it('attaches an empty object for data_json "{}"', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const alerts = [createAlert({ alert_id: 'ep-1' })];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertDataResponse([{ alert_id: 'ep-1', data_json: '{}' }])
    );

    const state = createDispatcherPipelineState({ dispatchable: alerts });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toEqual({});
  });

  it('leaves data undefined when the hydration query returns no row for an alert', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService, mockLogger } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const alerts = [createAlert({ alert_id: 'ep-missing' })];

    mockEsClient.esql.query.mockResolvedValueOnce(createAlertDataResponse([]));

    const state = createDispatcherPipelineState({ dispatchable: alerts });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function), {
      labels: { code: 'HYDRATE_ALERT_DATA_STEP_MISSING_RULE_EVENTS_ROW' },
    });
    const [message] = mockLogger.warn.mock.calls[0];
    expect(typeof message === 'function' ? message() : message).toBe(
      '1 of 1 alerts had no matching rule-events row; their data will be absent'
    );
  });

  it('leaves data undefined when data_json is null', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const alerts = [createAlert({ alert_id: 'ep-1' })];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertDataResponse([{ alert_id: 'ep-1', data_json: null }])
    );

    const state = createDispatcherPipelineState({ dispatchable: alerts });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toBeUndefined();
  });

  it('derives range bounds from min/max last_event_timestamp across all alerts', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const alerts = [
      createAlert({
        alert_id: 'ep-1',
        last_event_timestamp: '2026-01-22T07:05:00.000Z',
      }),
      createAlert({
        alert_id: 'ep-2',
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
      }),
      createAlert({
        alert_id: 'ep-3',
        last_event_timestamp: '2026-01-22T07:01:00.000Z',
      }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertDataResponse([
        { alert_id: 'ep-1', data_json: '{"a":1}' },
        { alert_id: 'ep-2', data_json: '{"b":2}' },
        { alert_id: 'ep-3', data_json: '{"c":3}' },
      ])
    );

    const state = createDispatcherPipelineState({ dispatchable: alerts });
    await step.execute(state, loggerService);

    const calledQuery: string = mockEsClient.esql.query.mock.calls[0][0].query;
    expect(calledQuery).toContain('"2026-01-22T07:01:00.000Z"');
    expect(calledQuery).toContain('"2026-01-22T07:10:00.000Z"');
  });

  it('attaches data to each alert independently', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    const alerts = [
      createAlert({ alert_id: 'ep-1', rule_id: 'r1' }),
      createAlert({ alert_id: 'ep-2', rule_id: 'r2' }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertDataResponse([
        { alert_id: 'ep-1', data_json: '{"x":1}' },
        { alert_id: 'ep-2', data_json: '{"y":2}' },
      ])
    );

    const state = createDispatcherPipelineState({ dispatchable: alerts });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.triage?.dispatchable[0].data).toEqual({ x: 1 });
    expect(result.data?.triage?.dispatchable[1].data).toEqual({ y: 2 });
  });

  it('concatenates results from multiple chunks', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = new HydrateAlertDataStep(queryService);

    // Two alerts that each end up in different chunks via oversized IDs
    const longId1 = 'a'.repeat(400_000) + '-1';
    const longId2 = 'b'.repeat(400_000) + '-2';
    const alerts = [
      createAlert({ alert_id: longId1, last_event_timestamp: '2026-01-22T07:00:00.000Z' }),
      createAlert({ alert_id: longId2, last_event_timestamp: '2026-01-22T07:01:00.000Z' }),
    ];

    mockEsClient.esql.query
      .mockResolvedValueOnce(createAlertDataResponse([{ alert_id: longId1, data_json: '{"c":1}' }]))
      .mockResolvedValueOnce(
        createAlertDataResponse([{ alert_id: longId2, data_json: '{"d":2}' }])
      );

    const state = createDispatcherPipelineState({ dispatchable: alerts });
    const result = await step.execute(state, loggerService);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    const alert1 = result.data?.triage?.dispatchable.find((e) => e.alert_id === longId1);
    const alert2 = result.data?.triage?.dispatchable.find((e) => e.alert_id === longId2);
    expect(alert1?.data).toEqual({ c: 1 });
    expect(alert2?.data).toEqual({ d: 2 });
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
  });
});
