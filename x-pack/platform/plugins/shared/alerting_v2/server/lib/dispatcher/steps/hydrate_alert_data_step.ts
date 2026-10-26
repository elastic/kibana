/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import { QueryServiceInternalToken } from '../../services/query_service/tokens';
import { getAlertDataQueries } from '../queries';
import { AlertTriage } from '../state';
import type {
  Alert,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';
import { parseDataJson } from './utils/parse_alert_data';
import type { LoggerServiceContract } from '../../services/logger_service/logger_service';

interface RawAlertData {
  alert_id: string;
  data_json: string | null;
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

    const { gte, lte } = computeTimestampBounds(triage.dispatchable);

    const { signal } = state.input;

    const responses = await Promise.all(
      getAlertDataQueries(alertIds, { gte, lte }).map((request) =>
        this.queryService.executeQueryRows<RawAlertData>({
          query: request.query,
          abortSignal: signal,
        })
      )
    );

    const dataByAlertId = new Map<string, string | null>();
    for (const row of responses.flat()) {
      dataByAlertId.set(row.alert_id, row.data_json);
    }

    const hydrated = dataByAlertId.size;
    const requested = alertIds.length;
    if (hydrated < requested) {
      logger.warn({
        code: ALERTING_LOG_CODES.HYDRATE_ALERT_DATA_STEP_MISSING_RULE_EVENTS_ROW,
        message: () =>
          `${requested - hydrated} of ${requested} alerts had no matching rule-events row; ` +
          `their data will be absent`,
      });
    }

    const hydratedTriage = triage.mapDispatchable((alert) => {
      const raw = dataByAlertId.get(alert.alert_id);
      if (raw == null) return alert;
      return { ...alert, data: parseDataJson(raw) };
    });

    return { type: 'continue', data: { triage: hydratedTriage } };
  }
}

function computeTimestampBounds(alerts: readonly Alert[]): { gte: string; lte: string } {
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
