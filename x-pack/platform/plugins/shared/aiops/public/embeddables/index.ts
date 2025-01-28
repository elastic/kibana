/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import type { AiopsPluginStart, AiopsPluginStartDeps } from '../types';

export const registerEmbeddables = (
  embeddable: EmbeddableSetup,
  core: CoreSetup<AiopsPluginStartDeps, AiopsPluginStart>
) => {
  embeddable.registerReactEmbeddableFactory(EMBEDDABLE_CHANGE_POINT_CHART_TYPE, async () => {
    const { getChangePointChartEmbeddableFactory } = await import('./change_point_chart');
    return getChangePointChartEmbeddableFactory(core.getStartServices);
  });
  embeddable.registerReactEmbeddableFactory(EMBEDDABLE_PATTERN_ANALYSIS_TYPE, async () => {
    const { getPatternAnalysisEmbeddableFactory } = await import('./pattern_analysis');
    return getPatternAnalysisEmbeddableFactory(core.getStartServices);
  });
  embeddable.registerReactEmbeddableFactory(EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE, async () => {
    const { getLogRateAnalysisEmbeddableFactory } = await import('./log_rate_analysis');
    return getLogRateAnalysisEmbeddableFactory(core.getStartServices);
  });
};
