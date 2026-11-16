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
import { AlertTriage } from '../state';
import type {
  Alert,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';
import { parseAlertDataForMatching } from './utils/parse_alert_data';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';

/**
 * Response body cap for one hydration query. Chunks are sized by statement bytes, not by the
 * `data` bytes they return, so wide alerts can push a chunk past the Elasticsearch client cap
 * (100 MB on Serverless). Kept below it so the step sees the size error and splits the chunk,
 * and so one parsed response stays well within the dispatcher's heap.
 */
export const HYDRATION_MAX_RESPONSE_SIZE_BYTES = 50 * 1024 * 1024;

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
    const { triage = AlertTriage.empty() } = state;

    if (!triage.hasDispatchable()) {
      return { type: 'continue' };
    }

    const alertIds = triage.dispatchableAlertIds();
    const bounds = computeTimestampBounds(triage.dispatchable);
    const { signal } = state.input;

    const { rows, oversizedAlertIds } = await this.fetchAlertData(alertIds, bounds, signal, logger);

    const dataByAlertId = new Map<string, string | null>();
    for (const row of rows) {
      dataByAlertId.set(row.alert_id, row.data_json);
    }

    const requested = alertIds.length;
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

    const hydratedTriage = triage.mapDispatchable((alert) => {
      const raw = dataByAlertId.get(alert.alert_id);
      if (raw == null) return alert;
      return { ...alert, data: parseAlertDataForMatching(raw) };
    });

    return { type: 'continue', data: { triage: hydratedTriage } };
  }

  /**
   * Runs the hydration queries one at a time, so at most one response is held in memory. When a
   * response exceeds HYDRATION_MAX_RESPONSE_SIZE_BYTES, the batch is halved and retried; the
   * halved size is kept for the remaining batches, since they likely carry data as wide.
   */
  private async fetchAlertData(
    alertIds: readonly string[],
    bounds: TimestampBounds,
    abortSignal: AbortSignal,
    logger: LoggerServiceContract
  ): Promise<FetchAlertDataResult> {
    const rows: RawAlertData[] = [];
    const oversizedAlertIds: string[] = [];
    let maxIdsPerQuery = ESQL_QUERY_ROW_LIMIT;

    for (const chunk of chunkInClauseLiterals(alertIds)) {
      let offset = 0;
      while (offset < chunk.length) {
        const batch = chunk.slice(offset, offset + maxIdsPerQuery);
        try {
          const batchRows = await this.queryService.executeQuery<RawAlertData>({
            query: getAlertDataQuery(batch, bounds).query,
            abortSignal,
            maxResponseSize: HYDRATION_MAX_RESPONSE_SIZE_BYTES,
          });
          rows.push(...batchRows);
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
    }

    return { rows, oversizedAlertIds };
  }
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
