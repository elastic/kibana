/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { HttpStart } from '@kbn/core/public';
import { CoreStart } from '@kbn/core-di-browser';
import type { AlertSummaryRequest, AlertSummaryResponse } from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ALERT_SUMMARY_API_PATH } from '../constants';

@injectable()
export class AlertSummaryApi {
  constructor(@inject(CoreStart('http')) private readonly http: HttpStart) {}

  public async getAlertSummary(
    request: AlertSummaryRequest,
    options?: { signal?: AbortSignal }
  ): Promise<AlertSummaryResponse> {
    return this.http.post<AlertSummaryResponse>(ALERTING_V2_ALERT_SUMMARY_API_PATH, {
      body: JSON.stringify(request),
      signal: options?.signal,
    });
  }
}
