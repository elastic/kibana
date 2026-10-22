/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIOPS_API_ENDPOINT, AIOPS_PLUGIN_ID } from '@kbn/aiops-common/constants';
import type { UsageCollectionSetup, UsageCounter } from '@kbn/usage-collection-plugin/server';

type RunOrigin = string | string[] | undefined;

export class AiopsUsage {
  private readonly usageCounter?: UsageCounter;

  constructor(usageCollection?: UsageCollectionSetup) {
    this.usageCounter = usageCollection?.createUsageCounter(AIOPS_PLUGIN_ID);
  }

  public trackCategorization(origin: RunOrigin) {
    this.trackRoute(`POST ${AIOPS_API_ENDPOINT.CATEGORIZATION_FIELD_VALIDATION}`, origin);
  }

  public trackLogRateAnalysis(origin: RunOrigin) {
    this.trackRoute(`POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS}`, origin);
  }

  public trackLogRateAnalysisFieldCandidates(origin: RunOrigin) {
    this.trackRoute(`POST ${AIOPS_API_ENDPOINT.LOG_RATE_ANALYSIS_FIELD_CANDIDATES}`, origin);
  }

  public trackRenderEsqlCategorizationResults(origin: RunOrigin) {
    this.trackRoute('render_esql_categorization_results', origin);
  }

  public trackRenderEsqlChangePointResults(origin: RunOrigin) {
    this.trackRoute('render_esql_change_point_results', origin);
  }

  private trackRoute(counterName: string, origin: RunOrigin) {
    if (this.usageCounter && typeof origin === 'string') {
      this.usageCounter.incrementCounter({
        counterName,
        counterType: `run_via_${origin}`,
        incrementBy: 1,
      });
    }
  }
}
