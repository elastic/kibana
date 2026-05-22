/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/public';
import { EMBEDDABLE_CHANGE_POINT_CHART_TYPE } from '@kbn/aiops-change-point-detection/constants';
import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import { EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis/constants';
import type { Reference } from '@kbn/content-management-utils';
import type { AiopsCoreSetup } from '../types';

export const registerEmbeddables = (
  embeddable: EmbeddableSetup,
  getStartServices: AiopsCoreSetup['getStartServices']
) => {
  embeddable.registerEmbeddablePublicDefinition(EMBEDDABLE_CHANGE_POINT_CHART_TYPE, async () => {
    const { getChangePointChartEmbeddableFactory } = await import('./change_point_chart');
    return getChangePointChartEmbeddableFactory(getStartServices);
  });
  embeddable.registerLegacyURLTransform(EMBEDDABLE_CHANGE_POINT_CHART_TYPE, async () => {
    const { transformOut } = await import('./change_point_chart');
    return transformOut as (storedState: object, references?: Reference[]) => object;
  });
  embeddable.registerEmbeddablePublicDefinition(EMBEDDABLE_PATTERN_ANALYSIS_TYPE, async () => {
    const { getPatternAnalysisEmbeddableFactory } = await import('./pattern_analysis');
    return getPatternAnalysisEmbeddableFactory(getStartServices);
  });
  embeddable.registerLegacyURLTransform(EMBEDDABLE_PATTERN_ANALYSIS_TYPE, async () => {
    const { transformOut } = await import('./pattern_analysis');
    return transformOut as (storedState: object, references?: Reference[]) => object;
  });
  embeddable.registerEmbeddablePublicDefinition(EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE, async () => {
    const { getLogRateAnalysisEmbeddableFactory } = await import('./log_rate_analysis');
    return getLogRateAnalysisEmbeddableFactory(getStartServices);
  });
  embeddable.registerLegacyURLTransform(EMBEDDABLE_LOG_RATE_ANALYSIS_TYPE, async () => {
    const { transformOut } = await import('./log_rate_analysis');
    return transformOut;
  });
};
