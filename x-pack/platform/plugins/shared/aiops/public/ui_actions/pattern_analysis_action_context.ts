/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { apiIsOfType, type EmbeddableApiContext } from '@kbn/presentation-publishing';
import { EMBEDDABLE_PATTERN_ANALYSIS_TYPE } from '@kbn/aiops-log-pattern-analysis/constants';
import type { ChangePointEmbeddableApi } from '../embeddables/change_point_chart/types';

export interface PatternAnalysisActionContext extends EmbeddableApiContext {
  embeddable: ChangePointEmbeddableApi;
}

export function isPatternAnalysisEmbeddableContext(
  arg: unknown
): arg is PatternAnalysisActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, EMBEDDABLE_PATTERN_ANALYSIS_TYPE)
  );
}
