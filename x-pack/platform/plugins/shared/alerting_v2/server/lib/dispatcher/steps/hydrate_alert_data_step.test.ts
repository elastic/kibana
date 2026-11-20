/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { DeeplyMockedApi } from '@kbn/core-elasticsearch-client-server-mocks';
import {
  BATCH_TARGET_SHARE,
  HydrateAlertDataStep,
  HYDRATION_TICK_BUDGET_RESPONSES,
} from './hydrate_alert_data_step';
import { ESQL_QUERY_ROW_LIMIT } from '../queries';
import type { SuppressedAlert } from '../state';
import type { Alert } from '../types';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { createQueryService } from '../../services/query_service/query_service.mock';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import type { DispatcherTelemetryContract } from '../otel/dispatcher_telemetry';
import {
  createAlert,
  createDispatcherConfigService,
  createDispatcherPipelineState,
  createDispatcherTelemetryMock,
} from '../fixtures/test_utils';
import { createAlertDataResponse } from '../fixtures/dispatcher';

const HYDRATION_MAX_RESPONSE_SIZE_BYTES = createDispatcherConfigService()
  .get('dispatcher.run.hydration.maxResponseSize')
  .getValueInBytes();
const HYDRATION_TICK_BUDGET_BYTES =
  HYDRATION_TICK_BUDGET_RESPONSES * HYDRATION_MAX_RESPONSE_SIZE_BYTES;

const createStep = (
  queryService: QueryServiceContract,
  {
    telemetry = createDispatcherTelemetryMock(),
    maxResponseSize,
  }: { telemetry?: DispatcherTelemetryContract; maxResponseSize?: string } = {}
) =>
  new HydrateAlertDataStep(
    queryService,
    createDispatcherConfigService({ run: { hydration: { maxResponseSize } } }),
    telemetry
  );

const queriedIds = ({ esql }: DeeplyMockedApi<ElasticsearchClient>): string[][] =>
  esql.query.mock.calls.map(([{ query }]) =>
    [...query.matchAll(/"(ep-\d+)"/g)].map(([, id]) => id)
  );

const responseTooLarge = () =>
  new errors.RequestAbortedError(
    'The content length (104872541) is bigger than the maximum allowed string (52428800)'
  );

describe('HydrateAlertDataStep', () => {
  it('is named hydrate_alert_data', () => {
    const { queryService } = createQueryService();

    expect(createStep(queryService).name).toBe('hydrate_alert_data');
  });

  it.each([
    ['empty', { dispatchable: [] }],
    ['absent', {}],
  ])('returns continue without querying when dispatchable is %s', async (_, overrides) => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = createStep(queryService);

    const state = createDispatcherPipelineState(overrides);
    const result = await step.execute(state, loggerService);

    expect(result).toEqual({ type: 'continue' });
    expect(mockEsClient.esql.query).not.toHaveBeenCalled();
  });

  it('un-flattens dot-separated keys in data_json', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = createStep(queryService);

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
    const step = createStep(queryService);

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
    const step = createStep(queryService);

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
    const step = createStep(queryService);

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
    const step = createStep(queryService);

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

  it('attaches data to each alert by alert_id regardless of row order', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = createStep(queryService);

    const alerts = [
      createAlert({ alert_id: 'ep-1', rule_id: 'r1' }),
      createAlert({ alert_id: 'ep-2', rule_id: 'r2' }),
    ];

    mockEsClient.esql.query.mockResolvedValueOnce(
      createAlertDataResponse([
        { alert_id: 'ep-2', data_json: '{"y":2}' },
        { alert_id: 'ep-1', data_json: '{"x":1}' },
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
    const step = createStep(queryService);

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

  it('applies the same range bounds to every chunk', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = createStep(queryService);

    const longId1 = 'a'.repeat(400_000) + '-1';
    const longId2 = 'b'.repeat(400_000) + '-2';
    const alerts = [
      createAlert({ alert_id: longId1, last_event_timestamp: '2026-01-22T07:00:00.000Z' }),
      createAlert({ alert_id: longId2, last_event_timestamp: '2026-01-22T07:10:00.000Z' }),
    ];

    mockEsClient.esql.query.mockResolvedValue(createAlertDataResponse([]));

    await step.execute(createDispatcherPipelineState({ dispatchable: alerts }), loggerService);

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
    for (const [{ query }] of mockEsClient.esql.query.mock.calls) {
      expect(query).toContain('"2026-01-22T07:00:00.000Z"');
      expect(query).toContain('"2026-01-22T07:10:00.000Z"');
    }
  });

  it('never puts more alert ids in a query than the row limit returns', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = createStep(queryService);

    const alerts = Array.from({ length: ESQL_QUERY_ROW_LIMIT + 1 }, (_, i) =>
      createAlert({ alert_id: `ep-${i}` })
    );

    mockEsClient.esql.query.mockResolvedValue(createAlertDataResponse([]));

    await step.execute(createDispatcherPipelineState({ dispatchable: alerts }), loggerService);

    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
    expect(mockEsClient.esql.query.mock.calls[1][0].query).toContain(
      `alert.id IN ("ep-${ESQL_QUERY_ROW_LIMIT}")`
    );
  });

  it('caps the response size of every hydration query', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = createStep(queryService);

    mockEsClient.esql.query.mockResolvedValueOnce(createAlertDataResponse([]));

    await step.execute(
      createDispatcherPipelineState({ dispatchable: [createAlert({ alert_id: 'ep-1' })] }),
      loggerService
    );

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxResponseSize: HYDRATION_MAX_RESPONSE_SIZE_BYTES })
    );
  });

  it('caps the response size at dispatcher.run.hydration.maxResponseSize', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = createStep(queryService, { maxResponseSize: '10mb' });

    mockEsClient.esql.query.mockResolvedValueOnce(createAlertDataResponse([]));

    await step.execute(
      createDispatcherPipelineState({ dispatchable: [createAlert({ alert_id: 'ep-1' })] }),
      loggerService
    );

    expect(mockEsClient.esql.query).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxResponseSize: 10 * 1024 * 1024 })
    );
  });

  describe('when a response exceeds the size cap', () => {
    it('halves the batch and retries until every alert is hydrated', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService, mockLogger } = createLoggerService();
      const step = createStep(queryService);

      const alerts = ['ep-1', 'ep-2', 'ep-3', 'ep-4'].map((id) => createAlert({ alert_id: id }));

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValueOnce(
          createAlertDataResponse([
            { alert_id: 'ep-1', data_json: '{"a":1}' },
            { alert_id: 'ep-2', data_json: '{"a":2}' },
          ])
        )
        .mockResolvedValueOnce(
          createAlertDataResponse([
            { alert_id: 'ep-3', data_json: '{"a":3}' },
            { alert_id: 'ep-4', data_json: '{"a":4}' },
          ])
        );

      const result = await step.execute(
        createDispatcherPipelineState({ dispatchable: alerts }),
        loggerService
      );

      expect(queriedIds(mockEsClient)).toEqual([
        ['ep-1', 'ep-2', 'ep-3', 'ep-4'],
        ['ep-1', 'ep-2'],
        ['ep-3', 'ep-4'],
      ]);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(result.data?.triage?.dispatchable.map(({ data }) => data)).toEqual([
        { a: 1 },
        { a: 2 },
        { a: 3 },
        { a: 4 },
      ]);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('does not grow back to a batch size that failed in the same tick', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      const alerts = ['ep-1', 'ep-2', 'ep-3', 'ep-4'].map((id) => createAlert({ alert_id: id }));

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValue(createAlertDataResponse([]));

      await step.execute(createDispatcherPipelineState({ dispatchable: alerts }), loggerService);

      expect(queriedIds(mockEsClient)).toEqual([
        ['ep-1', 'ep-2', 'ep-3', 'ep-4'],
        ['ep-1', 'ep-2'],
        ['ep-1'],
        ['ep-2'],
        ['ep-3'],
        ['ep-4'],
      ]);
    });

    it('skips an alert whose data alone exceeds the cap and hydrates the others', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService, mockLogger } = createLoggerService();
      const telemetry = createDispatcherTelemetryMock();
      const step = createStep(queryService, { telemetry });

      const alerts = ['ep-1', 'ep-2'].map((id) => createAlert({ alert_id: id }));

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValueOnce(
          createAlertDataResponse([{ alert_id: 'ep-2', data_json: '{"a":2}' }])
        );

      const result = await step.execute(
        createDispatcherPipelineState({ dispatchable: alerts }),
        loggerService
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(result.data?.triage?.dispatchable.map(({ data }) => data)).toEqual([
        undefined,
        { a: 2 },
      ]);
      expect(telemetry.recordOversizedAlertDataSkipped).toHaveBeenCalledWith(1);
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function), {
        labels: { code: 'HYDRATE_ALERT_DATA_STEP_OVERSIZED_DATA_SKIPPED' },
      });
      const [message] = mockLogger.warn.mock.calls[0];
      expect(typeof message === 'function' ? message() : message).toBe(
        `1 of 2 alerts have data larger than ${HYDRATION_MAX_RESPONSE_SIZE_BYTES} bytes; ` +
          'their data will be absent (first alert ids: ep-1)'
      );
    });

    it('grows the batch size again after skipping an oversized alert', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      const alerts = ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'].map((id) =>
        createAlert({ alert_id: id })
      );

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockRejectedValueOnce(responseTooLarge())
        .mockRejectedValueOnce(responseTooLarge())
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValue(createAlertDataResponse([]));

      await step.execute(createDispatcherPipelineState({ dispatchable: alerts }), loggerService);

      expect(queriedIds(mockEsClient)).toEqual([
        ['ep-1', 'ep-2', 'ep-3', 'ep-4', 'ep-5', 'ep-6'],
        ['ep-1', 'ep-2', 'ep-3'],
        ['ep-1', 'ep-2'],
        ['ep-1'],
        ['ep-2'],
        ['ep-3', 'ep-4', 'ep-5', 'ep-6'],
      ]);
    });

    describe('on the next tick', () => {
      const MAX_RESPONSE_SIZE_BYTES = 1024 * 1024;

      const alertsFrom = (first: number, count: number): Alert[] =>
        Array.from({ length: count }, (_, index) =>
          createAlert({ alert_id: `ep-${first + index}` })
        );

      // Halves 4 ids to 2 per query; the empty responses cannot grow it back to the failed size.
      const learnTwoIdsPerQuery = async (
        step: HydrateAlertDataStep,
        mockEsClient: DeeplyMockedApi<ElasticsearchClient>
      ) => {
        mockEsClient.esql.query
          .mockRejectedValueOnce(responseTooLarge())
          .mockResolvedValue(createAlertDataResponse([]));
        await step.execute(
          createDispatcherPipelineState({ dispatchable: alertsFrom(1, 4) }),
          createLoggerService().loggerService
        );
        expect(queriedIds(mockEsClient)).toEqual([
          ['ep-1', 'ep-2', 'ep-3', 'ep-4'],
          ['ep-1', 'ep-2'],
          ['ep-3', 'ep-4'],
        ]);
        mockEsClient.esql.query.mockReset();
      };

      const targetRowBytes = (idsPerQuery: number) =>
        Math.floor((BATCH_TARGET_SHARE * MAX_RESPONSE_SIZE_BYTES) / idsPerQuery);

      // A row this wide in the response projects `idsPerQuery` ids into the target share of the cap.
      const dataJsonProjecting = (idsPerQuery: number, alertId: string) => {
        const overhead = Buffer.byteLength(JSON.stringify([alertId, '{"a":""}']));
        return `{"a":"${'x'.repeat(targetRowBytes(idsPerQuery) - overhead)}"}`;
      };

      it('starts from the learned batch size and grows it to the row limit when rows are empty', async () => {
        const { queryService, mockEsClient } = createQueryService();
        const step = createStep(queryService, { maxResponseSize: '1mb' });
        await learnTwoIdsPerQuery(step, mockEsClient);

        mockEsClient.esql.query.mockResolvedValue(createAlertDataResponse([]));
        await step.execute(
          createDispatcherPipelineState({ dispatchable: alertsFrom(5, 8) }),
          createLoggerService().loggerService
        );

        expect(queriedIds(mockEsClient)).toEqual([
          ['ep-5', 'ep-6'],
          ['ep-7', 'ep-8', 'ep-9', 'ep-10', 'ep-11', 'ep-12'],
        ]);
      });

      it('keeps the batch size when the widest row projects no larger batch', async () => {
        const { queryService, mockEsClient } = createQueryService();
        const step = createStep(queryService, { maxResponseSize: '1mb' });
        await learnTwoIdsPerQuery(step, mockEsClient);

        mockEsClient.esql.query.mockResolvedValue(
          createAlertDataResponse([{ alert_id: 'ep-0', data_json: dataJsonProjecting(2, 'ep-0') }])
        );
        await step.execute(
          createDispatcherPipelineState({ dispatchable: alertsFrom(5, 6) }),
          createLoggerService().loggerService
        );

        expect(queriedIds(mockEsClient)).toEqual([
          ['ep-5', 'ep-6'],
          ['ep-7', 'ep-8'],
          ['ep-9', 'ep-10'],
        ]);
      });

      it('projects the batch size from the widest row, not the average', async () => {
        const { queryService, mockEsClient } = createQueryService();
        const step = createStep(queryService, { maxResponseSize: '1mb' });
        await learnTwoIdsPerQuery(step, mockEsClient);

        mockEsClient.esql.query.mockResolvedValue(
          createAlertDataResponse([
            { alert_id: 'ep-0', data_json: '{}' },
            { alert_id: 'ep-00', data_json: dataJsonProjecting(4, 'ep-00') },
          ])
        );
        await step.execute(
          createDispatcherPipelineState({ dispatchable: alertsFrom(5, 10) }),
          createLoggerService().loggerService
        );

        expect(queriedIds(mockEsClient)).toEqual([
          ['ep-5', 'ep-6'],
          ['ep-7', 'ep-8', 'ep-9', 'ep-10'],
          ['ep-11', 'ep-12', 'ep-13', 'ep-14'],
        ]);
      });

      it.each([
        ['a short batch', 1, false],
        ['a full batch', 2, true],
      ])(
        'encodes the widest row only when the batch may grow: %s',
        async (_, alertCount, encoded) => {
          const { queryService, mockEsClient } = createQueryService();
          const step = createStep(queryService, { maxResponseSize: '1mb' });
          await learnTwoIdsPerQuery(step, mockEsClient);

          const dataJson = dataJsonProjecting(4, 'ep-5');
          mockEsClient.esql.query.mockResolvedValue(
            createAlertDataResponse([{ alert_id: 'ep-5', data_json: dataJson }])
          );
          const stringify = jest.spyOn(JSON, 'stringify');
          try {
            await step.execute(
              createDispatcherPipelineState({ dispatchable: alertsFrom(5, alertCount) }),
              createLoggerService().loggerService
            );
            const encodedWidestRow = stringify.mock.calls.some(
              ([value]) => Array.isArray(value) && value[1] === dataJson
            );
            expect(encodedWidestRow).toBe(encoded);
          } finally {
            stringify.mockRestore();
          }
        }
      );

      it.each([
        ['escaped quotes', '\\"'],
        ['non-ASCII text', 'é'],
      ])(
        'projects the batch size from the encoded row size, not the data_json length, with %s',
        async (_, filler) => {
          const { queryService, mockEsClient } = createQueryService();
          const step = createStep(queryService, { maxResponseSize: '1mb' });
          await learnTwoIdsPerQuery(step, mockEsClient);

          // By length this row would project 4 ids per query; encoded, it takes about twice as many bytes.
          const dataJson = `{"a":"${filler.repeat(
            Math.floor((targetRowBytes(4) - 8) / filler.length)
          )}"}`;
          mockEsClient.esql.query.mockResolvedValue(
            createAlertDataResponse([{ alert_id: 'ep-0', data_json: dataJson }])
          );
          await step.execute(
            createDispatcherPipelineState({ dispatchable: alertsFrom(5, 6) }),
            createLoggerService().loggerService
          );

          expect(queriedIds(mockEsClient)).toEqual([
            ['ep-5', 'ep-6'],
            ['ep-7', 'ep-8'],
            ['ep-9', 'ep-10'],
          ]);
        }
      );
    });
  });

  describe('when the tick data budget is reached', () => {
    // Past half the tick budget, so no further response is allowed to start.
    const wideDataJson = `{"a":"${'x'.repeat(HYDRATION_TICK_BUDGET_BYTES / 2)}"}`;

    const alertAt = (alertId: string, minute: number, series: string): Alert =>
      createAlert({
        alert_id: alertId,
        rule_id: series,
        last_event_timestamp: `2026-01-22T07:${minute}:00.000Z`,
      });

    const ids = (alerts: readonly Alert[] | undefined) =>
      (alerts ?? []).map(({ alert_id: alertId }) => alertId);

    it('defers the remaining series to the next tick and stops the scan before them', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService, mockLogger } = createLoggerService();
      const step = createStep(queryService);

      const alerts = [
        alertAt('ep-1', 21, 's1'),
        alertAt('ep-2', 22, 's2'),
        alertAt('ep-3', 23, 's3'),
        alertAt('ep-4', 24, 's3'),
      ];

      mockEsClient.esql.query.mockRejectedValueOnce(responseTooLarge()).mockResolvedValueOnce(
        createAlertDataResponse([
          { alert_id: 'ep-1', data_json: wideDataJson },
          { alert_id: 'ep-2', data_json: '{"b":2}' },
        ])
      );

      const result = await step.execute(
        createDispatcherPipelineState({ alerts, dispatchable: alerts }),
        loggerService
      );

      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(2);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(ids(result.data?.triage?.dispatchable)).toEqual(['ep-1', 'ep-2']);
      expect(result.data?.triage?.dispatchable[1].data).toEqual({ b: 2 });
      expect(result.data?.scan?.deferred).toBe(true);
      expect(result.data?.scan?.truncated).toBe(true);
      expect(ids(result.data?.scan?.alerts)).toEqual(['ep-1', 'ep-2']);
      expect(result.data?.scan?.truncationEdge()?.toISOString()).toBe('2026-01-22T07:22:00.000Z');
      // Deferred alerts are not reported as missing rule-events rows.
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.any(Function), {
        labels: { code: 'HYDRATE_ALERT_DATA_STEP_TICK_BUDGET_REACHED' },
      });
      const [message] = mockLogger.warn.mock.calls[0];
      expect(typeof message === 'function' ? message() : message).toBe(
        `alert data reached the ${HYDRATION_TICK_BUDGET_BYTES} bytes tick budget; ` +
          '1 series (2 of 4 dispatchable alerts not hydrated) deferred to the next tick'
      );
    });

    it('starts another query while a full response still fits in the budget', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      const alerts = [alertAt('ep-1', 21, 's1'), alertAt('ep-2', 22, 's2')];
      const remainingBudget = HYDRATION_TICK_BUDGET_BYTES - HYDRATION_MAX_RESPONSE_SIZE_BYTES;
      const dataJsonFillingRemainder = `{"a":"${'x'.repeat(remainingBudget - 8)}"}`;

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValueOnce(
          createAlertDataResponse([{ alert_id: 'ep-1', data_json: dataJsonFillingRemainder }])
        )
        .mockResolvedValueOnce(createAlertDataResponse([]));

      const result = await step.execute(
        createDispatcherPipelineState({ alerts, dispatchable: alerts }),
        loggerService
      );

      expect(dataJsonFillingRemainder).toHaveLength(remainingBudget);
      expect(queriedIds(mockEsClient)).toEqual([['ep-1', 'ep-2'], ['ep-1'], ['ep-2']]);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(result.data?.scan).toBeUndefined();
      expect(ids(result.data?.triage?.dispatchable)).toEqual(['ep-1', 'ep-2']);
    });

    it('derives the budget from dispatcher.run.hydration.maxResponseSize', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService, mockLogger } = createLoggerService();
      const step = createStep(queryService, { maxResponseSize: '1mb' });

      const alerts = [
        alertAt('ep-1', 21, 's1'),
        alertAt('ep-2', 22, 's2'),
        alertAt('ep-3', 23, 's3'),
      ];
      // Each response fits the 1mb cap; together they pass half the 2mb budget.
      const dataJson = `{"a":"${'x'.repeat(600_000)}"}`;

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValueOnce(createAlertDataResponse([{ alert_id: 'ep-1', data_json: dataJson }]))
        .mockResolvedValueOnce(
          createAlertDataResponse([{ alert_id: 'ep-2', data_json: dataJson }])
        );

      const result = await step.execute(
        createDispatcherPipelineState({ alerts, dispatchable: alerts }),
        loggerService
      );

      expect(queriedIds(mockEsClient)).toEqual([
        ['ep-1', 'ep-2', 'ep-3'],
        ['ep-1', 'ep-2'],
        ['ep-1'],
        ['ep-2'],
      ]);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(ids(result.data?.triage?.dispatchable)).toEqual(['ep-1', 'ep-2']);
      expect(ids(result.data?.scan?.alerts)).toEqual(['ep-1', 'ep-2']);
      const [message] = mockLogger.warn.mock.calls[0];
      expect(typeof message === 'function' ? message() : message).toBe(
        `alert data reached the ${HYDRATION_TICK_BUDGET_RESPONSES * 1024 * 1024} bytes tick ` +
          'budget; 1 series (1 of 3 dispatchable alerts not hydrated) deferred to the next tick'
      );
    });

    it('defers from the right position when the budget is reached in a later chunk', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      // Ids this long land in separate chunks.
      const [idA, idB, idC] = ['a', 'b', 'c'].map((prefix) => `${prefix.repeat(400_000)}-1`);
      const alerts = [
        createAlert({
          alert_id: idA,
          rule_id: 's1',
          last_event_timestamp: '2026-01-22T07:21:00.000Z',
        }),
        createAlert({
          alert_id: idB,
          rule_id: 's2',
          last_event_timestamp: '2026-01-22T07:22:00.000Z',
        }),
        createAlert({
          alert_id: idC,
          rule_id: 's3',
          last_event_timestamp: '2026-01-22T07:23:00.000Z',
        }),
      ];

      mockEsClient.esql.query
        .mockResolvedValueOnce(
          createAlertDataResponse([{ alert_id: idA, data_json: wideDataJson }])
        )
        .mockResolvedValue(createAlertDataResponse([]));

      const result = await step.execute(
        createDispatcherPipelineState({ alerts, dispatchable: alerts }),
        loggerService
      );

      expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(ids(result.data?.triage?.dispatchable)).toEqual([idA]);
      expect(ids(result.data?.scan?.alerts)).toEqual([idA]);
    });

    it('defers a series whole, dropping its hydrated and suppressed alerts', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      const suppressed: SuppressedAlert = {
        ...alertAt('ep-5', 22, 's2'),
        reason: 'ack',
        action_subtype: 'ack',
      };
      const dispatchable = [
        alertAt('ep-1', 21, 's1'),
        alertAt('ep-2', 23, 's2'),
        alertAt('ep-3', 24, 's2'),
        alertAt('ep-4', 25, 's3'),
      ];
      const scanAlerts = [dispatchable[0], suppressed, ...dispatchable.slice(1)];

      mockEsClient.esql.query.mockRejectedValueOnce(responseTooLarge()).mockResolvedValueOnce(
        createAlertDataResponse([
          { alert_id: 'ep-1', data_json: wideDataJson },
          { alert_id: 'ep-2', data_json: '{"b":2}' },
        ])
      );

      const result = await step.execute(
        createDispatcherPipelineState({
          alerts: scanAlerts,
          dispatchable,
          suppressed: [suppressed],
        }),
        loggerService
      );

      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(ids(result.data?.triage?.dispatchable)).toEqual(['ep-1']);
      expect(ids(result.data?.triage?.suppressed)).toEqual([]);
      // Cut at the suppressed ep-5 (07:22), the oldest alert of a deferred series.
      expect(ids(result.data?.scan?.alerts)).toEqual(['ep-1']);
    });

    it('hydrates first the series that owns the oldest scan alert, so the scan keeps an alert', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      // s2's suppressed ep-5 is older than every dispatchable alert.
      const suppressed: SuppressedAlert = {
        ...alertAt('ep-5', 20, 's2'),
        reason: 'ack',
        action_subtype: 'ack',
      };
      const dispatchable = [
        alertAt('ep-1', 21, 's1'),
        alertAt('ep-2', 22, 's2'),
        alertAt('ep-3', 23, 's3'),
      ];
      const scanAlerts = [suppressed, ...dispatchable];

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValueOnce(
          createAlertDataResponse([{ alert_id: 'ep-2', data_json: wideDataJson }])
        );

      const result = await step.execute(
        createDispatcherPipelineState({
          alerts: scanAlerts,
          dispatchable,
          suppressed: [suppressed],
        }),
        loggerService
      );

      expect(queriedIds(mockEsClient)).toEqual([
        ['ep-2', 'ep-1', 'ep-3'],
        ['ep-2', 'ep-1'],
        ['ep-2'],
      ]);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(ids(result.data?.triage?.dispatchable)).toEqual(['ep-2']);
      expect(ids(result.data?.triage?.suppressed)).toEqual(['ep-5']);
      expect(ids(result.data?.scan?.alerts)).toEqual(['ep-5']);
      expect(result.data?.scan?.truncationEdge()?.toISOString()).toBe('2026-01-22T07:20:00.000Z');
    });

    it('keeps alerts after the cut dispatchable but out of the scan', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      // s1 holds the oldest and the newest alert, s2 sits between them.
      const alerts = [
        alertAt('ep-1', 21, 's1'),
        alertAt('ep-2', 22, 's2'),
        alertAt('ep-3', 23, 's1'),
      ];

      mockEsClient.esql.query.mockRejectedValueOnce(responseTooLarge()).mockResolvedValueOnce(
        createAlertDataResponse([
          { alert_id: 'ep-1', data_json: wideDataJson },
          { alert_id: 'ep-3', data_json: '{"c":3}' },
        ])
      );

      const result = await step.execute(
        createDispatcherPipelineState({ alerts, dispatchable: alerts }),
        loggerService
      );

      expect(queriedIds(mockEsClient)).toEqual([
        ['ep-1', 'ep-3', 'ep-2'],
        ['ep-1', 'ep-3'],
      ]);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(ids(result.data?.triage?.dispatchable)).toEqual(['ep-1', 'ep-3']);
      expect(ids(result.data?.scan?.alerts)).toEqual(['ep-1']);
    });

    it('never defers the first series, so every tick makes progress', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      const alerts = [
        alertAt('ep-1', 21, 's1'),
        alertAt('ep-2', 22, 's1'),
        alertAt('ep-3', 23, 's1'),
        alertAt('ep-4', 24, 's2'),
      ];

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValueOnce(
          createAlertDataResponse([{ alert_id: 'ep-1', data_json: wideDataJson }])
        )
        .mockResolvedValueOnce(createAlertDataResponse([]));

      const result = await step.execute(
        createDispatcherPipelineState({ alerts, dispatchable: alerts }),
        loggerService
      );

      expect(queriedIds(mockEsClient)).toEqual([
        ['ep-1', 'ep-2', 'ep-3', 'ep-4'],
        ['ep-1', 'ep-2'],
        ['ep-3', 'ep-4'],
      ]);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(result.data?.scan).toBeUndefined();
      expect(ids(result.data?.triage?.dispatchable)).toEqual(['ep-1', 'ep-2', 'ep-3', 'ep-4']);
    });

    it('does not count a fully suppressed series as the first series', async () => {
      const { queryService, mockEsClient } = createQueryService();
      const { loggerService } = createLoggerService();
      const step = createStep(queryService);

      // s0 owns the oldest scan alert but has nothing to hydrate.
      const suppressed: SuppressedAlert = {
        ...alertAt('ep-0', 20, 's0'),
        reason: 'ack',
        action_subtype: 'ack',
      };
      const dispatchable = [
        alertAt('ep-1', 21, 's1'),
        alertAt('ep-2', 22, 's1'),
        alertAt('ep-3', 23, 's1'),
      ];

      mockEsClient.esql.query
        .mockRejectedValueOnce(responseTooLarge())
        .mockResolvedValueOnce(
          createAlertDataResponse([{ alert_id: 'ep-1', data_json: wideDataJson }])
        )
        .mockResolvedValueOnce(createAlertDataResponse([]));

      const result = await step.execute(
        createDispatcherPipelineState({
          alerts: [suppressed, ...dispatchable],
          dispatchable,
          suppressed: [suppressed],
        }),
        loggerService
      );

      expect(queriedIds(mockEsClient)).toEqual([
        ['ep-1', 'ep-2', 'ep-3'],
        ['ep-1', 'ep-2'],
        ['ep-3'],
      ]);
      expect(result.type).toBe('continue');
      if (result.type !== 'continue') return;
      expect(result.data?.scan).toBeUndefined();
      expect(ids(result.data?.triage?.dispatchable)).toEqual(['ep-1', 'ep-2', 'ep-3']);
    });
  });

  it('rethrows query errors that are not response size errors', async () => {
    const { queryService, mockEsClient } = createQueryService();
    const { loggerService } = createLoggerService();
    const step = createStep(queryService);

    const failure = new errors.RequestAbortedError('Request aborted');
    mockEsClient.esql.query.mockRejectedValueOnce(failure);

    await expect(
      step.execute(
        createDispatcherPipelineState({ dispatchable: [createAlert({ alert_id: 'ep-1' })] }),
        loggerService
      )
    ).rejects.toBe(failure);
    expect(mockEsClient.esql.query).toHaveBeenCalledTimes(1);
  });
});
