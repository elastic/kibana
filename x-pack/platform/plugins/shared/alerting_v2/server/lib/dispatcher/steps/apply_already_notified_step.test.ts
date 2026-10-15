/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ApplyAlreadyNotifiedStep } from './apply_already_notified_step';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ESQL_QUERY_ROW_LIMIT } from '../queries';
import { createAlreadyNotifiedResponse } from '../fixtures/dispatcher';
import {
  createActionGroup,
  createAlert,
  createDispatcherPipelineState,
  createStepLogger,
} from '../fixtures/test_utils';
import type { AlreadyNotifiedRecord } from '../types';

const logger = createStepLogger();

const alertA = createAlert({
  alert_id: 'alert-a',
  last_event_timestamp: '2026-01-22T07:10:00.000Z',
});
const alertB = createAlert({
  alert_id: 'alert-b',
  last_event_timestamp: '2026-01-22T07:12:00.000Z',
});

const notified = (
  actionGroupId: string,
  alertId: string,
  notifiedThrough: string
): AlreadyNotifiedRecord => ({
  action_group_id: actionGroupId,
  alert_id: alertId,
  notified_through: notifiedThrough,
});

const setup = (records: AlreadyNotifiedRecord[] = []) => {
  const { queryService, mockEsClient } = createQueryService();
  mockEsClient.esql.query.mockResolvedValue(createAlreadyNotifiedResponse(records));
  return { step: new ApplyAlreadyNotifiedStep(queryService), mockEsClient };
};

describe('ApplyAlreadyNotifiedStep', () => {
  it('does not query when there are no groups', async () => {
    const { step, mockEsClient } = setup();

    const result = await step.execute(createDispatcherPipelineState({ groups: [] }), logger);

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('keeps every alert pending when nothing was notified', async () => {
    const group = createActionGroup({ id: 'g1', alerts: [alertA, alertB] });
    const { step } = setup();

    const result = await step.execute(createDispatcherPipelineState({ groups: [group] }), logger);

    expect(result).toEqual({
      type: 'continue',
      data: { groups: [group], alreadyNotified: [] },
    });
  });

  it('treats an alert as notified when the record covers its event time', async () => {
    const group = createActionGroup({ id: 'g1', alerts: [alertA] });
    const { step } = setup([notified('g1', 'alert-a', '2026-01-22T07:10:00.000Z')]);

    const result = await step.execute(createDispatcherPipelineState({ groups: [group] }), logger);

    expect(result).toEqual({
      type: 'continue',
      data: { groups: [], alreadyNotified: [group] },
    });
  });

  it('keeps an alert pending when it has a newer event than the record', async () => {
    const group = createActionGroup({ id: 'g1', alerts: [alertB] });
    const { step } = setup([notified('g1', 'alert-b', '2026-01-22T07:11:00.000Z')]);

    const result = await step.execute(createDispatcherPipelineState({ groups: [group] }), logger);

    expect(result).toEqual({
      type: 'continue',
      data: { groups: [group], alreadyNotified: [] },
    });
  });

  it('splits an aggregated group into notified and pending alerts', async () => {
    const group = createActionGroup({
      id: 'g1',
      groupKey: { 'data.host': 'h1' },
      alerts: [alertA, alertB],
    });
    const { step } = setup([notified('g1', 'alert-a', '2026-01-22T07:10:00.000Z')]);

    const result = await step.execute(createDispatcherPipelineState({ groups: [group] }), logger);

    expect(result).toEqual({
      type: 'continue',
      data: {
        groups: [{ ...group, alerts: [alertB] }],
        alreadyNotified: [{ ...group, alerts: [alertA] }],
      },
    });
  });

  it('only covers the group that notified a shared alert', async () => {
    const first = createActionGroup({ id: 'g1', policyId: 'p1', alerts: [alertA] });
    const second = createActionGroup({ id: 'g2', policyId: 'p2', alerts: [alertA] });
    const { step } = setup([notified('g1', 'alert-a', '2026-01-22T07:10:00.000Z')]);

    const result = await step.execute(
      createDispatcherPipelineState({ groups: [first, second] }),
      logger
    );

    expect(result).toEqual({
      type: 'continue',
      data: { groups: [second], alreadyNotified: [first] },
    });
  });

  it('bounds the lookup to records written after the earliest alert event', async () => {
    const group = createActionGroup({ id: 'g1', alerts: [alertB, alertA] });
    const { step, mockEsClient } = setup();

    await step.execute(createDispatcherPipelineState({ groups: [group] }), logger);

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: { range: { '@timestamp': { gte: '2026-01-22T07:10:00.000Z' } } },
      }),
      expect.anything()
    );
  });

  it('warns when a lookup chunk returns the row limit', async () => {
    const group = createActionGroup({ id: 'g1', alerts: [alertA] });
    const { loggerService, mockLogger } = createLoggerService();
    const { step } = setup(
      Array.from({ length: ESQL_QUERY_ROW_LIMIT }, (_, i) =>
        notified('g1', `other-${i}`, '2026-01-22T07:10:00.000Z')
      )
    );

    const result = await step.execute(
      createDispatcherPipelineState({ groups: [group] }),
      loggerService
    );

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function), {
      labels: { code: ALERTING_LOG_CODES.DISPATCH_ALREADY_NOTIFIED_ROW_LIMIT_REACHED },
    });
    expect(result).toEqual({
      type: 'continue',
      data: { groups: [group], alreadyNotified: [] },
    });
  });
});
