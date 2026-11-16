/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import { inject, injectable } from 'inversify';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { chunkInClauseLiterals, ESQL_QUERY_ROW_LIMIT, getAlertDataQuery } from '../queries';
import { AlertScan, AlertTriage } from '../state';
import type {
  Alert,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';
import { parseAlertDataForMatching } from './utils/parse_alert_data';
import { suppressionSeriesKey } from './utils/suppression_key';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';

/**
 * Response body cap for one hydration query. Chunks are sized by statement bytes, not by the
 * `data` bytes they return, so wide alerts can push a chunk past the Elasticsearch client cap
 * (100 MB on Serverless). Kept below it so the step sees the size error and splits the chunk.
 */
export const HYDRATION_MAX_RESPONSE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Upper bound on the `data` one tick holds, measured as `data_json` length (a close proxy for
 * bytes). A query starts only while a full response still fits, so the bound holds even when
 * every response is close to the cap. Series that do not fit are deferred to the next tick.
 */
export const HYDRATION_TICK_BUDGET_BYTES = 2 * HYDRATION_MAX_RESPONSE_SIZE_BYTES;

const LOGGED_OVERSIZED_ALERT_IDS = 10;

interface RawAlertData {
  alert_id: string;
  data_json: string | null;
}

interface TimestampBounds {
  gte: string;
  lte: string;
}

interface FetchAlertDataResult {
  rows: RawAlertData[];
  oversizedAlertIds: string[];
  /** Ids never queried because the tick budget was reached; a suffix of the input ids. */
  deferredAlertIds: string[];
}

@injectable()
export class HydrateAlertDataStep implements DispatcherStep {
  public readonly name = 'hydrate_alert_data';

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract
  ) {}

  public async execute(
    state: Readonly<DispatcherPipelineState>,
    logger: LoggerServiceContract
  ): Promise<DispatcherStepOutput> {
    const { triage = AlertTriage.empty(), scan = AlertScan.empty() } = state;

    if (!triage.hasDispatchable()) {
      return { type: 'continue' };
    }

    const { alertIds, firstSeriesSize } = orderBySeries(scan.alerts, triage.dispatchable);
    const bounds = computeTimestampBounds(triage.dispatchable);
    const { signal } = state.input;

    const { rows, oversizedAlertIds, deferredAlertIds } = await this.fetchAlertData({
      alertIds,
      firstSeriesSize,
      bounds,
      abortSignal: signal,
      logger,
    });

    const dataByAlertId = new Map<string, string | null>();
    for (const row of rows) {
      dataByAlertId.set(row.alert_id, row.data_json);
    }

    const requested = alertIds.length - deferredAlertIds.length;
    if (oversizedAlertIds.length > 0) {
      logger.warn({
        code: ALERTING_LOG_CODES.HYDRATE_ALERT_DATA_STEP_OVERSIZED_DATA_SKIPPED,
        message: () =>
          `${oversizedAlertIds.length} of ${requested} alerts have data larger than ` +
          `${HYDRATION_MAX_RESPONSE_SIZE_BYTES} bytes; their data will be absent ` +
          `(first alert ids: ${oversizedAlertIds.slice(0, LOGGED_OVERSIZED_ALERT_IDS).join(', ')})`,
      });
    }

    const missing = requested - dataByAlertId.size - oversizedAlertIds.length;
    if (missing > 0) {
      logger.warn({
        code: ALERTING_LOG_CODES.HYDRATE_ALERT_DATA_STEP_MISSING_RULE_EVENTS_ROW,
        message: () =>
          `${missing} of ${requested} alerts had no matching rule-events row; ` +
          `their data will be absent`,
      });
    }

    const withData = (alert: Alert): Alert => {
      const raw = dataByAlertId.get(alert.alert_id);
      if (raw == null) return alert;
      return { ...alert, data: parseAlertDataForMatching(raw) };
    };

    if (deferredAlertIds.length === 0) {
      return { type: 'continue', data: { triage: triage.mapDispatchable(withData) } };
    }

    // `fire` / `suppress` / `unmatched` records are per series and hide the whole series from the
    // next scan, so a series is deferred whole: suppressed alerts and already-hydrated ones too.
    const deferredIds = new Set(deferredAlertIds);
    const deferredSeries = new Set(
      triage.dispatchable
        .filter(({ alert_id: alertId }) => deferredIds.has(alertId))
        .map((alert) => suppressionSeriesKey(alert))
    );
    const isDeferred = (alert: Alert): boolean => deferredSeries.has(suppressionSeriesKey(alert));

    logger.warn({
      code: ALERTING_LOG_CODES.HYDRATE_ALERT_DATA_STEP_TICK_BUDGET_REACHED,
      message: () =>
        `alert data reached the ${HYDRATION_TICK_BUDGET_BYTES} bytes tick budget; ` +
        `${deferredSeries.size} series (${deferredAlertIds.length} of ${alertIds.length} ` +
        `dispatchable alerts not hydrated) deferred to the next tick`,
    });

    return {
      type: 'continue',
      data: {
        triage: triage.dropWhere(isDeferred).mapDispatchable(withData),
        scan: scan.withDeferredTail(isDeferred),
      },
    };
  }

  /**
   * Runs the hydration queries one at a time, in `alertIds` order. When a response exceeds
   * HYDRATION_MAX_RESPONSE_SIZE_BYTES, the batch is halved and retried; the halved size is kept
   * for the remaining batches, since they likely carry data as wide. Once the next response could
   * overflow HYDRATION_TICK_BUDGET_BYTES, the remaining ids are deferred, but never before the
   * first series is complete, so every tick makes progress.
   */
  private async fetchAlertData({
    alertIds,
    firstSeriesSize,
    bounds,
    abortSignal,
    logger,
  }: {
    alertIds: readonly string[];
    firstSeriesSize: number;
    bounds: TimestampBounds;
    abortSignal: AbortSignal;
    logger: LoggerServiceContract;
  }): Promise<FetchAlertDataResult> {
    const rows: RawAlertData[] = [];
    const oversizedAlertIds: string[] = [];
    let maxIdsPerQuery = ESQL_QUERY_ROW_LIMIT;
    let chunkStart = 0;
    let hydratedBytes = 0;

    for (const chunk of chunkInClauseLiterals(alertIds)) {
      let offset = 0;
      while (offset < chunk.length) {
        const processed = chunkStart + offset;
        const budgetReached =
          hydratedBytes + HYDRATION_MAX_RESPONSE_SIZE_BYTES > HYDRATION_TICK_BUDGET_BYTES;
        if (budgetReached && processed >= firstSeriesSize) {
          return { rows, oversizedAlertIds, deferredAlertIds: alertIds.slice(processed) };
        }

        const batch = chunk.slice(offset, offset + maxIdsPerQuery);
        try {
          const batchRows = await this.queryService.executeQuery<RawAlertData>({
            query: getAlertDataQuery(batch, bounds).query,
            abortSignal,
            maxResponseSize: HYDRATION_MAX_RESPONSE_SIZE_BYTES,
          });
          for (const row of batchRows) {
            rows.push(row);
            hydratedBytes += row.data_json?.length ?? 0;
          }
          offset += batch.length;
        } catch (error) {
          if (!isMaximumResponseSizeExceededError(error)) throw error;

          if (batch.length === 1) {
            oversizedAlertIds.push(batch[0]);
            offset += 1;
            continue;
          }

          maxIdsPerQuery = Math.ceil(batch.length / 2);
          logger.debug({
            message: () =>
              `Hydration response for ${batch.length} alerts exceeded ` +
              `${HYDRATION_MAX_RESPONSE_SIZE_BYTES} bytes; retrying with ${maxIdsPerQuery} alerts per query`,
          });
        }
      }
      chunkStart += chunk.length;
    }

    return { rows, oversizedAlertIds, deferredAlertIds: [] };
  }
}

/**
 * Unique dispatchable alert ids with the alerts of each series contiguous, so a budget cut defers
 * whole series and splits at most the one it falls in. Series are ordered by their oldest scan
 * alert, suppressed ones included: the first series then owns the oldest alert of any series
 * that can be deferred, so the narrowed scan always keeps it and the watermark can advance.
 */
function orderBySeries(
  scanAlerts: readonly Alert[],
  dispatchable: readonly Alert[]
): { alertIds: string[]; firstSeriesSize: number } {
  const idsBySeries = new Map<string, Set<string>>();
  const idsOf = (alert: Alert): Set<string> => {
    const key = suppressionSeriesKey(alert);
    let ids = idsBySeries.get(key);
    if (!ids) {
      ids = new Set();
      idsBySeries.set(key, ids);
    }
    return ids;
  };

  for (const alert of scanAlerts) idsOf(alert);
  for (const alert of dispatchable) idsOf(alert).add(alert.alert_id);

  const seriesIds = [...idsBySeries.values()].filter((ids) => ids.size > 0);
  return {
    alertIds: seriesIds.flatMap((ids) => [...ids]),
    firstSeriesSize: seriesIds[0]?.size ?? 0,
  };
}

function computeTimestampBounds(alerts: readonly Alert[]): TimestampBounds {
  const epoch = new Date(0).toISOString();
  let gte: string | undefined;
  let lte: string | undefined;

  for (const alert of alerts) {
    const parsed = new Date(alert.last_event_timestamp);
    if (Number.isNaN(parsed.getTime())) continue;

    const ts = parsed.toISOString();
    if (gte === undefined || ts < gte) gte = ts;
    if (lte === undefined || ts > lte) lte = ts;
  }

  return { gte: gte ?? epoch, lte: lte ?? epoch };
}
