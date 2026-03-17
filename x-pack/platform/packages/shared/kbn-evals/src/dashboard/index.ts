/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Kibana-specific dashboard module for evaluation trend visualizations.
 *
 * This module depends on Kibana Lens and Saved Objects APIs and is intentionally
 * coupled to the Kibana runtime. When the evaluation layer is extracted for
 * non-Kibana use (see vision Section 5), this module should be excluded.
 *
 * All Lens visualization field references use the canonical `kibana-evaluations`
 * data stream schema defined in {@link EvaluationScoreDocument} and the index
 * template in {@link EvaluationScoreRepository.ensureIndexTemplate}. The
 * `evaluator.metadata.*` sub-fields (e.g. `input_tokens`) are accessible via
 * the `flattened` mapping type.
 *
 * @module dashboard
 */
export {
  DASHBOARD_ID,
  DATA_VIEW_ID,
  generateDashboardBody,
  generateDataViewBody,
} from './saved_objects';
