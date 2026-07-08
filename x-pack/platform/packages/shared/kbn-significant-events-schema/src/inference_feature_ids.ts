/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Parent feature for Streams Significant Events (Inference Feature Registry). */
export const SIGNIFICANT_EVENTS_INFERENCE_PARENT_FEATURE_ID = 'significant_events' as const;

/** Knowledge Indicator feature extraction (KI extraction). */
export const SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID =
  'significant_events_ki_extraction' as const;

/** Knowledge Indicator query generation. */
export const SIGNIFICANT_EVENTS_KI_QUERY_GENERATION_INFERENCE_FEATURE_ID =
  'significant_events_ki_query_generation' as const;

/** Discovery and significant event generation. */
export const SIGNIFICANT_EVENTS_DISCOVERY_INFERENCE_FEATURE_ID =
  'significant_events_discovery' as const;

/** Root cause investigation. */
export const SIGNIFICANT_EVENTS_INVESTIGATION_INFERENCE_FEATURE_ID =
  'significant_events_investigation' as const;

/** Extracting durable knowledge from recent AI chat conversations into memory. */
export const SIGNIFICANT_EVENTS_CONVERSATION_SCRAPER_INFERENCE_FEATURE_ID =
  'significant_events_conversation_scraper' as const;

/** Synthesizing significant events knowledge indicators into memory wiki pages. */
export const SIGNIFICANT_EVENTS_MEMORY_SYNTHESIS_INFERENCE_FEATURE_ID =
  'significant_events_memory_synthesis' as const;

/**
 * Curating the memory wiki: merging duplicates, removing stale entries, and
 * reconciling knowledge gaps (from investigations and the periodic memory audit).
 */
export const SIGNIFICANT_EVENTS_MEMORY_CONSOLIDATION_INFERENCE_FEATURE_ID =
  'significant_events_memory_consolidation' as const;
