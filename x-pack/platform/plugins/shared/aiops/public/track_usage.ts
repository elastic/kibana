/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { ApplicationStart, HttpStart } from '@kbn/core/public';
import { AIOPS_API_ENDPOINT, AIOPS_USAGE_ID } from '@kbn/aiops-common/constants';
import type { AiopsUsageId } from '@kbn/aiops-common/constants';

export class AiopsUsage {
  constructor(private readonly http: HttpStart, private readonly application: ApplicationStart) {}

  public trackCategorization(origin?: string) {
    return this.track(AIOPS_USAGE_ID.CATEGORIZATION, origin);
  }

  public trackLogRateAnalysis(origin?: string) {
    return this.track(AIOPS_USAGE_ID.LOG_RATE_ANALYSIS, origin);
  }

  public trackLogRateAnalysisFieldCandidates(origin?: string) {
    return this.track(AIOPS_USAGE_ID.LOG_RATE_ANALYSIS_FIELD_CANDIDATES, origin);
  }

  public trackRenderEsqlCategorizationResults(origin?: string) {
    return this.track(AIOPS_USAGE_ID.RENDER_ESQL_CATEGORIZATION_RESULTS, origin);
  }

  public trackRenderEsqlChangePointResults(origin?: string) {
    return this.track(AIOPS_USAGE_ID.RENDER_ESQL_CHANGE_POINT_RESULTS, origin);
  }

  /**
   * The ID of the app the user is currently in.
   */
  private async getCurrentAppId(): Promise<string> {
    const appId = await firstValueFrom(this.application.currentAppId$);
    return appId ?? 'unknown';
  }

  /**
   * Telemetry is best effort, so failures are ignored.
   * The origin defaults to the app the user is currently in.
   */
  private async track(id: AiopsUsageId, origin?: string): Promise<void> {
    try {
      await this.http.post(AIOPS_API_ENDPOINT.TELEMETRY, {
        version: '1',
        body: JSON.stringify({ id, origin: origin ?? (await this.getCurrentAppId()) }),
      });
    } catch (e) {
      // Ignore telemetry failures.
    }
  }
}
