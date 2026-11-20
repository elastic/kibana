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
import {
  chunkInClauseLiterals,
  ESQL_QUERY_ROW_LIMIT,
  getAlertDataQuery,
  type TimestampBounds,
} from '../queries';
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
import { ConfigService } from '../../services/config_service/config_service';
import {
  DispatcherTelemetryToken,
  type DispatcherTelemetryContract,
} from '../otel/dispatcher_telemetry';

/**
 * The `data` one tick holds is capped at this many times the response cap, measured as
 * `data_json` length (a close proxy for bytes). A query starts only while a full response still
 * fits, so the bound holds even when every response is close to the cap. Series that do not fit
 * are deferred to the next tick.
 */
export const HYDRATION_TICK_BUDGET_RESPONSES = 2;

/**
 * Share of the response cap a grown batch is projected to fill, assuming every row takes as many
 * response bytes as the widest row seen. The rest is headroom for the response envelope and for
 * rows that encode larger than the longest `data_json` (more quotes or non-ASCII text).
 */
export const BATCH_TARGET_SHARE = 0.8;

const LOGGED_OVERSIZED_ALERT_IDS = 10;

interface RawAlertData {
  alert_id: string;
  data_json: string | null;
}

interface FetchAlertDataResult {
  rows: RawAlertData[];
  oversizedAlertIds: string[];
  /** Number of leading ids queried; the rest were deferred because the tick budget was reached. */
  processed: number;
}

@injectable()
export class HydrateAlertDataStep implements DispatcherStep {
  public readonly name = 'hydrate_alert_data';

  /**
   * Response body cap for one hydration query (`dispatcher.run.hydration.maxResponseSize`).
   * Chunks are sized by statement bytes, not by the `data` bytes they return, so wide alerts can
   * push a chunk past the cap. The step sees the size error and splits the chunk.
   */
  private readonly maxResponseSizeBytes: number;
  private readonly tickBudgetBytes: number;

  /**
   * Alert ids per hydration query. Kept across ticks (the step is a singleton), so wide alert
   * data does not cost the same failed queries on every tick.
   */
  private maxIdsPerQuery = ESQL_QUERY_ROW_LIMIT;

  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(ConfigService) configService: ConfigService,
    @inject(DispatcherTelemetryToken) private readonly telemetry: DispatcherTelemetryContract
  ) {
    this.maxResponseSizeBytes = configService
      .get('dispatcher.run.hydration.maxResponseSize')
      .getValueInBytes();
    this.tickBudgetBytes = HYDRATION_TICK_BUDGET_RESPONSES * this.maxResponseSizeBytes;
  }

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

    const { rows, oversizedAlertIds, processed } = await this.fetchAlertData({
      alertIds,
      firstSeriesSize,
      bounds,
      abortSignal: signal,
      logger,
    });

    const dataByAlertId = new Map(
      rows.map(({ alert_id: alertId, data_json: dataJson }) => [alertId, dataJson])
    );

    if (oversizedAlertIds.length > 0) {
      this.telemetry.recordOversizedAlertDataSkipped(oversizedAlertIds.length);
      logger.warn({
        code: ALERTING_LOG_CODES.HYDRATE_ALERT_DATA_STEP_OVERSIZED_DATA_SKIPPED,
        message: () =>
          `${oversizedAlertIds.length} of ${processed} alerts have data larger than ` +
          `${this.maxResponseSizeBytes} bytes; their data will be absent ` +
          `(first alert ids: ${oversizedAlertIds.slice(0, LOGGED_OVERSIZED_ALERT_IDS).join(', ')})`,
      });
    }

    const missing = processed - dataByAlertId.size - oversizedAlertIds.length;
    if (missing > 0) {
      logger.warn({
        code: ALERTING_LOG_CODES.HYDRATE_ALERT_DATA_STEP_MISSING_RULE_EVENTS_ROW,
        message: () =>
          `${missing} of ${processed} alerts had no matching rule-events row; ` +
          `their data will be absent`,
      });
    }

    const withData = (alert: Alert): Alert => {
      const raw = dataByAlertId.get(alert.alert_id);
      if (raw == null) return alert;
      return { ...alert, data: parseAlertDataForMatching(raw) };
    };

    if (processed === alertIds.length) {
      return { type: 'continue', data: { triage: triage.mapDispatchable(withData) } };
    }

    // `fire` / `suppress` / `unmatched` records are per series and hide the whole series from the
    // next scan, so a series is deferred whole: suppressed alerts and already-hydrated ones too.
    const deferredIds = new Set(alertIds.slice(processed));
    const deferredSeries = new Set(
      triage.dispatchable
        .filter(({ alert_id: alertId }) => deferredIds.has(alertId))
        .map(suppressionSeriesKey)
    );
    const isDeferred = (alert: Alert): boolean => deferredSeries.has(suppressionSeriesKey(alert));

    logger.warn({
      code: ALERTING_LOG_CODES.HYDRATE_ALERT_DATA_STEP_TICK_BUDGET_REACHED,
      message: () =>
        `alert data reached the ${this.tickBudgetBytes} bytes tick budget; ` +
        `${deferredSeries.size} series (${alertIds.length - processed} of ${alertIds.length} ` +
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
   * the response cap, the batch is halved and retried. After a full batch, the size grows to
   * what its widest row projects to fit, but never back to a size that failed in this tick. Once
   * the next response could overflow the tick budget, the remaining ids are deferred, but never
   * before the first series is complete, so every tick makes progress.
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
    let processed = 0;
    let hydratedBytes = 0;
    let smallestFailedBatchSize = Infinity;

    for (const chunk of chunkInClauseLiterals(alertIds)) {
      const chunkEnd = processed + chunk.length;
      while (processed < chunkEnd) {
        const budgetReached = hydratedBytes + this.maxResponseSizeBytes > this.tickBudgetBytes;
        if (budgetReached && processed >= firstSeriesSize) {
          return { rows, oversizedAlertIds, processed };
        }

        const batch = alertIds.slice(
          processed,
          Math.min(processed + this.maxIdsPerQuery, chunkEnd)
        );
        let batchRows: RawAlertData[];
        try {
          batchRows = await this.queryService.executeQuery<RawAlertData>({
            query: getAlertDataQuery(batch, bounds).query,
            abortSignal,
            maxResponseSize: this.maxResponseSizeBytes,
          });
        } catch (error) {
          if (!isMaximumResponseSizeExceededError(error)) throw error;

          if (batch.length === 1) {
            oversizedAlertIds.push(batch[0]);
            processed += 1;
            // The failed sizes may all be due to this alert, so they no longer cap growth.
            smallestFailedBatchSize = Infinity;
            continue;
          }

          const halvedSize = Math.ceil(batch.length / 2);
          smallestFailedBatchSize = Math.min(smallestFailedBatchSize, batch.length);
          this.maxIdsPerQuery = halvedSize;
          logger.debug({
            message: () =>
              `Hydration response for ${batch.length} alerts exceeded ` +
              `${this.maxResponseSizeBytes} bytes; retrying with ${halvedSize} alerts per query`,
          });
          continue;
        }

        let widestRow: RawAlertData | undefined;
        let widestRowLength = -1;
        for (const row of batchRows) {
          rows.push(row);
          const rowLength = row.data_json?.length ?? 0;
          hydratedBytes += rowLength;
          if (rowLength > widestRowLength) {
            widestRow = row;
            widestRowLength = rowLength;
          }
        }
        processed += batch.length;

        const widestRowBytes = widestRow ? encodedRowBytes(widestRow) : 0;
        // An empty response projects to Infinity, i.e. the row limit.
        const projectedSize = Math.min(
          ESQL_QUERY_ROW_LIMIT,
          Math.floor((BATCH_TARGET_SHARE * this.maxResponseSizeBytes) / widestRowBytes)
        );
        // A short batch (end of a chunk) may be cut before the widest rows of a full one.
        const canGrow =
          batch.length === this.maxIdsPerQuery &&
          projectedSize > batch.length &&
          projectedSize < smallestFailedBatchSize;
        if (canGrow) {
          this.maxIdsPerQuery = projectedSize;
          logger.debug({
            message: () =>
              `Widest hydrated row was ${widestRowBytes} bytes; growing from ${batch.length} ` +
              `to ${projectedSize} alerts per query`,
          });
        }
      }
    }

    return { rows, oversizedAlertIds, processed };
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

/**
 * Bytes a row takes in the ES|QL response `values` array. `data_json` comes back as an escaped
 * JSON string, so quotes, backslashes and non-ASCII text make it larger than its `length`.
 */
function encodedRowBytes({ alert_id: alertId, data_json: dataJson }: RawAlertData): number {
  return Buffer.byteLength(JSON.stringify([alertId, dataJson]));
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
