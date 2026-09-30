/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Usage attribution only (EIS use-case header, token usage docs, cost view); these don't select models.

/** Parent usage id for all Nightshift inference requests. */
export const NIGHTSHIFT_USAGE_PARENT_ID = 'nightshift' as const;

/** Product solution for Nightshift usage attribution. */
export const NIGHTSHIFT_USAGE_PRODUCT_SOLUTION = 'observability' as const;

/** Product feature for Nightshift usage attribution. */
export const NIGHTSHIFT_USAGE_PRODUCT_FEATURE = 'nightshift' as const;

/** Usage id for Knowledge Indicator feature extraction. */
export const NIGHTSHIFT_KI_EXTRACTION_USAGE_ID = 'nightshift_ki_extraction' as const;

/** Usage id for Knowledge Indicator query generation. */
export const NIGHTSHIFT_KI_QUERY_GENERATION_USAGE_ID = 'nightshift_ki_query_generation' as const;

/** Usage id for discovery and significant event generation. */
export const NIGHTSHIFT_DISCOVERY_USAGE_ID = 'nightshift_discovery' as const;

/** Usage id for root cause investigation. */
export const NIGHTSHIFT_INVESTIGATION_USAGE_ID = 'nightshift_investigation' as const;

/** Usage id shared by the post-round memory jobs: decision tree reinforce, Cortex and Memory optimize. */
export const NIGHTSHIFT_INVESTIGATION_MEMORY_USAGE_ID = 'nightshift_investigation_memory' as const;
