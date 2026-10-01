/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Parent usage attribution id for Significant Events inference requests. */
export const SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID = 'significant_events' as const;

/** Product solution for Significant Events usage attribution. */
export const SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_SOLUTION = 'observability' as const;

/** Product feature for Significant Events usage attribution. */
export const SIGNIFICANT_EVENTS_INFERENCE_PRODUCT_FEATURE = 'nightshift' as const;

/** Usage attribution id for Knowledge Indicator feature extraction. */
export const SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID =
  'significant_events_ki_extraction' as const;

/** Usage attribution id for Knowledge Indicator query generation. */
export const SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID =
  'significant_events_ki_query_generation' as const;

/** Usage attribution id for discovery and significant event generation. */
export const SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID =
  'significant_events_discovery' as const;

/** Usage attribution id for root cause investigation. */
export const SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID =
  'significant_events_investigation' as const;

/** Usage attribution id for decision tree reinforcement. */
export const SIGNIFICANT_EVENTS_DECISION_TREE_REINFORCE_INFERENCE_FEATURE_ID =
  'significant_events_decision_tree_reinforce' as const;
