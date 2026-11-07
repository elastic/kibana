/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { AlertEventSeverity } from '@kbn/alerting-v2-schemas';
import { FetchAlertsStep, parseAlerts } from './fetch_alerts_step';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import { createDispatchableAlertEventsResponse } from '../fixtures/dispatcher';
import {
  createAlert,
  createDispatcherConfigService,
  createDispatcherPipelineState,
  createDispatcherTelemetryMock,
  createStepLogger,
  MOCK_KIBANA_BASE_URL,
} from '../fixtures/test_utils';
import { ESQL_QUERY_ROW_LIMIT } from '../queries';

const makeSubPlanError = () =>
  new errors.ResponseError({
    statusCode: 400,
    body: {
      error: {
        type: 'illegal_argument_exception',
        reason: 'sub-plan execution results too large [21mb] > [20mb]',
      },
    },
  } as DiagnosticResult);

const logger = createStepLogger();
const telemetry = createDispatcherTelemetryMock();

describe('FetchAlertsStep', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('is named fetch_alerts', () => {
    const { queryService } = createQueryService();

    expect(
      new FetchAlertsStep(
        queryService,
        MOCK_KIBANA_BASE_URL,
        createDispatcherConfigService(),
        telemetry
      ).name
    ).toBe('fetch_alerts');
  });

  it('returns alerts and continues when alerts are found', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    const alerts = [
      createAlert({ rule_id: 'r1', group_hash: 'h1', alert_id: 'e1' }),
      createAlert({ rule_id: 'r2', group_hash: 'h2', alert_id: 'e2' }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(alerts));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.scan?.alerts).toEqual(alerts);
  });

  it('halts with no_alerts when none are found', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'halt', reason: 'no_alerts' });
  });

  it('does not cap the Lucene filter at windowEnd so actions stamped after the settle buffer still join last_fired', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    mockEsClient.esql.query.mockResolvedValueOnce(
      createDispatchableAlertEventsResponse([createAlert()])
    );

    const state = createDispatcherPipelineState();
    const { windowStart, windowEnd } = state.input;
    await step.execute(state, logger);

    const request = mockEsClient.esql.query.mock.calls[0][0];
    expect(request.filter).toEqual({
      range: {
        '@timestamp': {
          gte: windowStart.toISOString(),
        },
      },
    });
    expect(request.query).toContain(
      `type IS NULL OR @timestamp >= "${windowStart.toISOString()}"::DATETIME AND @timestamp <= "${windowEnd.toISOString()}"::DATETIME`
    );
  });

  it('caps the scan at dispatcher.run.alerts.max and flags a full batch as truncated', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService({ run: { alerts: { max: 1000 } } }),
      telemetry
    );

    const alerts = Array.from({ length: 1000 }, (_, i) =>
      createAlert({ alert_id: `ep-${i}`, group_hash: `h-${i}` })
    );
    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(alerts));

    const result = await step.execute(createDispatcherPipelineState(), logger);

    const request = mockEsClient.esql.query.mock.calls[0][0];
    expect(request.query.trimEnd().endsWith('| LIMIT 1000')).toBe(true);
    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.scan?.truncated).toBe(true);
  });

  it('sets truncated: true when the query returns exactly ESQL_QUERY_ROW_LIMIT rows', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    const maxAlerts = Array.from({ length: ESQL_QUERY_ROW_LIMIT }, (_, i) =>
      createAlert({ alert_id: `ep-${i}`, group_hash: `h-${i}` })
    );
    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(maxAlerts));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.scan?.truncated).toBe(true);
  });

  it('sets truncated: false when the query returns fewer than ESQL_QUERY_ROW_LIMIT rows', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    const alerts = Array.from({ length: ESQL_QUERY_ROW_LIMIT - 1 }, (_, i) =>
      createAlert({ alert_id: `ep-${i}`, group_hash: `h-${i}` })
    );
    mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse(alerts));

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, logger);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data?.scan?.truncated).toBe(false);
  });

  describe('truncation signal', () => {
    const MAX = 1000;

    const buildStep = () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService, mockLogger } = createLoggerService();
      const step = new FetchAlertsStep(
        queryService,
        MOCK_KIBANA_BASE_URL,
        createDispatcherConfigService({ run: { alerts: { max: MAX } } }),
        telemetry
      );
      return { step, mockEsClient, loggerService, mockLogger };
    };

    const buildAlerts = (count: number, lastTimestamp = '2026-01-22T07:33:00.000Z') =>
      Array.from({ length: count }, (_, i) =>
        createAlert({
          alert_id: `ep-${i}`,
          group_hash: `h-${i}`,
          last_event_timestamp: i === count - 1 ? lastTimestamp : '2026-01-22T07:25:00.000Z',
        })
      );

    it('warns with the limit, truncation edge and window bounds and records the metric', async () => {
      const { step, mockEsClient, loggerService, mockLogger } = buildStep();
      mockEsClient.esql.query.mockResolvedValueOnce(
        createDispatchableAlertEventsResponse(buildAlerts(MAX))
      );
      const state = createDispatcherPipelineState();
      const { windowStart, windowEnd } = state.input;

      await step.execute(state, loggerService);

      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function), {
        labels: { code: ALERTING_LOG_CODES.DISPATCHER_ALERT_SCAN_TRUNCATED },
      });
      const [messageFn] = mockLogger.warn.mock.calls[0] as [() => string];
      const message = messageFn();
      expect(message).toContain(`${MAX}`);
      expect(message).toContain('2026-01-22T07:33:00.000Z');
      expect(message).toContain(windowStart.toISOString());
      expect(message).toContain(windowEnd.toISOString());
      expect(telemetry.recordAlertScanTruncated).toHaveBeenCalledTimes(1);
    });

    it('does not throw on a corrupt truncation edge timestamp', async () => {
      const { step, mockEsClient, loggerService, mockLogger } = buildStep();
      mockEsClient.esql.query.mockResolvedValueOnce(
        createDispatchableAlertEventsResponse(buildAlerts(MAX, 'not-a-date'))
      );

      const result = await step.execute(createDispatcherPipelineState(), loggerService);

      expect(result.type).toBe('continue');
      const [messageFn] = mockLogger.warn.mock.calls[0] as [() => string];
      expect(messageFn()).toContain('not-a-date');
      expect(telemetry.recordAlertScanTruncated).toHaveBeenCalledTimes(1);
    });

    it('neither warns nor records when the scan stays under the limit', async () => {
      const { step, mockEsClient, loggerService, mockLogger } = buildStep();
      mockEsClient.esql.query.mockResolvedValueOnce(
        createDispatchableAlertEventsResponse(buildAlerts(MAX - 1))
      );

      await step.execute(createDispatcherPipelineState(), loggerService);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(telemetry.recordAlertScanTruncated).not.toHaveBeenCalled();
    });

    it('neither warns nor records when no alerts are found', async () => {
      const { step, mockEsClient, loggerService, mockLogger } = buildStep();
      mockEsClient.esql.query.mockResolvedValueOnce(createDispatchableAlertEventsResponse([]));

      await step.execute(createDispatcherPipelineState(), loggerService);

      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(telemetry.recordAlertScanTruncated).not.toHaveBeenCalled();
    });
  });

  it('propagates unclassified query errors', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    mockEsClient.esql.query.mockRejectedValueOnce(new Error('ES error'));

    const state = createDispatcherPipelineState();
    await expect(step.execute(state, logger)).rejects.toThrow('ES error');
  });

  it('halts with inline_stats_too_large on a 400 illegal_argument_exception sub-plan error', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    mockEsClient.esql.query.mockRejectedValueOnce(makeSubPlanError());

    const state = createDispatcherPipelineState();
    const result = await step.execute(state, logger);

    expect(result).toEqual({ type: 'halt', reason: 'inline_stats_too_large' });
  });

  it('logs the held watermark, its lag, and the force-advance threshold on a sub-plan error', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService, mockLogger } = createLoggerService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    mockEsClient.esql.query.mockRejectedValueOnce(makeSubPlanError());

    // Default input: startedAt=08:00, eventWatermark=07:30, windowStart=07:20, windowEnd=07:35.
    await step.execute(createDispatcherPipelineState(), loggerService);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'ES rejected the INLINE STATS pre-fetch query for ' +
        '[2026-01-22T07:20:00.000Z, 2026-01-22T07:35:00.000Z] (sub-plan too large). ' +
        'Watermark held at 2026-01-22T07:30:00.000Z (lag: 1800000ms); the escape hatch ' +
        'force-advances on its first fire after lag exceeds 15m.',
      expect.objectContaining({
        labels: expect.objectContaining({ code: 'DISPATCHER_INLINE_STATS_TOO_LARGE' }),
      })
    );
  });

  it('propagates a 400 with a different reason (not sub-plan)', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const step = new FetchAlertsStep(
      queryService,
      MOCK_KIBANA_BASE_URL,
      createDispatcherConfigService(),
      telemetry
    );

    const otherError = new errors.ResponseError({
      statusCode: 400,
      body: {
        error: { type: 'illegal_argument_exception', reason: 'field [foo] is not supported' },
      },
    } as DiagnosticResult);

    mockEsClient.esql.query.mockRejectedValueOnce(otherError);

    const state = createDispatcherPipelineState();
    await expect(step.execute(state, logger)).rejects.toBe(otherError);
  });
});

describe('parseAlerts', () => {
  it('passes through all core fields and omits severity when severity is null', () => {
    const raw = [
      {
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
        rule_id: 'r1',
        source: 'internal',
        space_id: 'default',
        group_hash: 'h1',
        alert_id: 'e1',
        alert_status: 'active' as const,
        severity: null,
      },
    ];

    const result = parseAlerts(raw, MOCK_KIBANA_BASE_URL);

    expect(result).toStrictEqual([
      {
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
        rule_id: 'r1',
        source: 'internal',
        space_id: 'default',
        group_hash: 'h1',
        alert_id: 'e1',
        alert_status: 'active',
        alert_url: 'https://kibana.example.com/app/observability/alerting/alerts/e1',
      },
    ]);
  });

  it('includes severity when severity is not null', () => {
    const raw = [
      {
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
        rule_id: 'r1',
        source: 'internal',
        space_id: 'default',
        group_hash: 'h1',
        alert_id: 'e1',
        alert_status: 'active' as const,
        severity: 'medium' as AlertEventSeverity,
      },
    ];

    const result = parseAlerts(raw, MOCK_KIBANA_BASE_URL);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('medium');
  });

  it('passes source, space_id, and null rule_id through for external alerts', () => {
    const raw = [
      {
        last_event_timestamp: '2026-01-22T07:10:00.000Z',
        rule_id: null,
        source: 'pagerduty',
        space_id: 'space-a',
        group_hash: 'h1',
        alert_id: 'e1',
        alert_status: 'active' as const,
        severity: null,
      },
    ];

    const result = parseAlerts(raw, MOCK_KIBANA_BASE_URL);

    expect(result).toHaveLength(1);
    expect(result[0].rule_id).toBeNull();
    expect(result[0].source).toBe('pagerduty');
    expect(result[0].space_id).toBe('space-a');
    expect(result[0].alert_url).toBe(
      'https://kibana.example.com/s/space-a/app/observability/alerting/alerts/e1'
    );
  });
});
