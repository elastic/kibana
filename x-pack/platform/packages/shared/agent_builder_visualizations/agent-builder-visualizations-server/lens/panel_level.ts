/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const PANEL_LEVEL_KEYS = [
  'hide_title',
  'hide_border',
  'drilldowns',
  'enhancements',
] as const;

export type PanelLevelKey = (typeof PANEL_LEVEL_KEYS)[number];

export const stripPanelLevelKeys = (
  config: Record<string, unknown>
): { config: Record<string, unknown>; panelLevel: Record<string, unknown> } => {
  const next = { ...config };
  const panelLevel: Record<string, unknown> = {};
  for (const key of PANEL_LEVEL_KEYS) {
    if (next[key] !== undefined) {
      panelLevel[key] = next[key];
      delete next[key];
    }
  }
  return { config: next, panelLevel };
};
