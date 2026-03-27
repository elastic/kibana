/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Kibana-specific dashboard module for evaluation trend visualizations.
 *
 * This module depends on Kibana Lens and Dashboard APIs and is intentionally
 * coupled to the Kibana runtime. It lives in @kbn/evals-extensions because
 * it represents a Phase 4 extension feature (Lens dashboards) that should not
 * be part of the core @kbn/evals package.
 *
 * All Lens visualization field references use the canonical `kibana-evaluations`
 * data stream schema defined in {@link EvaluationScoreDocument} from @kbn/evals.
 *
 * @module dashboard
 */
export {
  DASHBOARD_ID,
  DATA_VIEW_ID,
  generateDashboardBody,
  generateDataViewBody,
} from './saved_objects';
