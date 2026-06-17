/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PatternAnalysisEmbeddableState } from '@kbn/aiops-server-schemas/embeddables/pattern_analysis';

export type MinimumTimeRangeOption = 'No minimum' | '1 week' | '1 month' | '3 months' | '6 months';

export type StoredPatternAnalysisEmbeddableState = Omit<
  PatternAnalysisEmbeddableState,
  'data_view_id'
>;
