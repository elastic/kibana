/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { DASHBOARD_NAMESPACE, dashboardTools } from './constants';
export {
  buildLensPanelFromApi,
  buildMarkdownPanel,
  buildPanelFromRawConfig,
  calculateMarkdownPanelHeight,
  getMarkdownPanelHeight,
  getPanelWidth,
  normalizePanels,
} from './panel_utils';
export type { BuildPanelFromRawConfigOptions, PanelLayoutConfig } from './panel_utils';
export {
  DEFAULT_PANEL_HEIGHT,
  LARGE_PANEL_WIDTH,
  MARKDOWN_MAX_HEIGHT,
  MARKDOWN_MIN_HEIGHT,
  MARKDOWN_PANEL_WIDTH,
  SMALL_CHART_TYPES,
  SMALL_PANEL_WIDTH,
} from './panel_constants';
