/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  buildStabilityBadgeHtml,
  getStabilityBadgeHtml,
  STABILITY_BADGE_HEIGHT_PX,
} from './stability/get_stability_badge_html';

export { setStabilityBadgeThemeContext } from './stability/stability_badge_theme';

export { getExtensionStability } from './stability/get_extension_stability';
export type { StabilitySource } from './stability/get_extension_stability';
