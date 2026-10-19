/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { AIOPS_API_ENDPOINT, AIOPS_USAGE_ID } from '@kbn/aiops-common/constants';
import type { AiopsUsageId } from '@kbn/aiops-common/constants';

export class AiopsUsage {
  constructor(private readonly http: HttpStart) {}

  public trackCategorization(origin: string) {
    return this.track(AIOPS_USAGE_ID.CATEGORIZATION, origin);
  }

  public trackLogRateAnalysis(origin: string) {
    return this.track(AIOPS_USAGE_ID.LOG_RATE_ANALYSIS, origin);
  }

  public trackLogRateAnalysisFieldCandidates(origin: string) {
    return this.track(AIOPS_USAGE_ID.LOG_RATE_ANALYSIS_FIELD_CANDIDATES, origin);
  }

  public trackRenderEsqlCategorizationResults(origin: string) {
    return this.track(AIOPS_USAGE_ID.RENDER_ESQL_CATEGORIZATION_RESULTS, origin);
  }

  public trackRenderEsqlChangePointResults(origin: string) {
    return this.track(AIOPS_USAGE_ID.RENDER_ESQL_CHANGE_POINT_RESULTS, origin);
  }

  /**
   * Telemetry is best effort, so failures are ignored.
   */
  private async track(id: AiopsUsageId, origin: string): Promise<void> {
    try {
      await this.http.post(AIOPS_API_ENDPOINT.TELEMETRY, {
        version: '1',
        body: JSON.stringify({ id, origin }),
      });
    } catch (e) {
      // Ignore telemetry failures.
    }
  }
}
