/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { buildLensConfig } from './lens/build_lens_config';
export { getChartTypeSelectionPromptContent } from './lens/chart_type_guidance';
export { getEsqlDataSourceCarriers } from './lens/graph_lens';
export type { VisualizationConfig } from './lens/types';
export {
  buildVegaConfig,
  sanitizePanelVegaSpec,
  DASHBOARD_NEW_VIS_PANEL_GUIDANCE,
  NEVER_HAND_AUTHOR_VEGA_GUIDANCE,
  VEGA_SCOPE_AGENT_GUIDANCE,
  formatRawVegaAllowlist,
  formatRawVegaAllowlistCompact,
  formatRawVegaCatalogIds,
} from './vega';
export type { SanitizePanelVegaSpecResult } from './vega';
