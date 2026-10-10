/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AI_INSIGHTS_EMBEDDABLE_TYPE = 'ai_insights';
export const ADD_AI_INSIGHTS_ACTION_ID = 'addAiInsightsPanelAction';

/** Feature id used when listing GenAI connectors for this panel. */
export const AI_INSIGHTS_CONNECTOR_FEATURE_ID = 'agent_builder';

export const AI_INSIGHTS_API_PATH = '/internal/agent_builder_dashboards/ai_insights';

export const AI_INSIGHTS_MAX_ESQL_QUERIES = 5;
export const AI_INSIGHTS_MAX_ESQL_ROWS = 20;
export const AI_INSIGHTS_MAX_DATA_SOURCES = 3;
export const AI_INSIGHTS_MAX_KEYWORD_FIELDS = 5;
export const AI_INSIGHTS_MAX_NUMERIC_FIELDS = 5;

/** Whether insights are generated on panel load or only when the user asks. */
export const AI_INSIGHTS_GENERATION_MODE = {
  automatic: 'automatic',
  on_demand: 'on_demand',
} as const;

/** Whether insights refresh when dashboard time/filters change. */
export const AI_INSIGHTS_REFRESH_MODE = {
  auto: 'auto',
  manual: 'manual',
} as const;

/** Whether the panel grid hugs content or stays a fixed height with scroll. */
export const AI_INSIGHTS_HEIGHT_MODE = {
  auto: 'auto',
  fixed: 'fixed',
} as const;

/** Overall dashboard health assessment shown in the panel. */
export const AI_INSIGHTS_STATUS = {
  green: 'green',
  yellow: 'yellow',
  red: 'red',
} as const;

/** Fallback expanded height before content is measured. */
export const AI_INSIGHTS_DEFAULT_GRID_HEIGHT = 8;

/** Compact strip height for empty / no-model / on-demand CTAs (header + CTA row). */
export const AI_INSIGHTS_STRIP_GRID_HEIGHT = 5;

/** Collapsed dashboard grid height — fits the status header row + branded border. */
export const AI_INSIGHTS_COLLAPSED_GRID_HEIGHT = 3;

/** Collapsed height when the stale warning row is also visible. */
export const AI_INSIGHTS_COLLAPSED_STALE_GRID_HEIGHT = 5;
