/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { buildVegaConfig } from './build_config';
export type { BuildVegaConfigParams, BuildVegaConfigResult } from './build_config';
export { createVegaGraph } from './graph';
export {
  normalizeVegaSpec,
  rewriteRawVegaExpressions,
  VEGA_LITE_SCHEMA,
  VEGA_SCHEMA,
  CANONICAL_ESQL_SOURCE_NAME,
} from './normalize_spec';
export { sanitizePanelVegaSpec } from './sanitize_panel_vega_spec';
export type { SanitizePanelVegaSpecResult } from './sanitize_panel_vega_spec';
export { escapeVegaFieldReferences } from './field_escaping';
export { createAuthorVegaSpecPrompt } from './prompts';
export type { VegaDialect, VegaCatalogId } from './dialect';
export {
  DASHBOARD_NEW_VIS_PANEL_GUIDANCE,
  NEVER_HAND_AUTHOR_VEGA_GUIDANCE,
  VEGA_SCOPE_AGENT_GUIDANCE,
  formatRawVegaAllowlist,
  formatRawVegaAllowlistCompact,
  formatRawVegaCatalogIds,
} from './agent_guidance';
