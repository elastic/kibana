/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEsqlDataSourceCarriers } from '@kbn/agent-builder-visualizations-server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

export const PANEL_KEYS = [
  'title',
  'description',
  'hide_title',
  'hide_border',
  'drilldowns',
  'enhancements',
] as const;

export type PanelQuerySource = 'esql' | 'dsl' | 'other';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isLensApiConfig = (config: unknown): config is Record<string, unknown> =>
  isRecord(config) && typeof config.type === 'string';

export const isEsqlLensConfig = (config: unknown): boolean => {
  const carriers = getEsqlDataSourceCarriers(config);
  return (
    carriers.length > 0 &&
    carriers.every(
      (carrier) => carrier.data_source?.type === 'esql' && Boolean(carrier.data_source.query)
    )
  );
};

export const getPanelQuerySource = (panelType: string, config: unknown): PanelQuerySource => {
  if (panelType !== LENS_EMBEDDABLE_TYPE || !isLensApiConfig(config)) {
    return 'other';
  }
  return isEsqlLensConfig(config) ? 'esql' : 'dsl';
};

export const collectExistingEsqlQueries = (config: unknown): string[] => {
  const queries: string[] = [];
  for (const carrier of getEsqlDataSourceCarriers(config)) {
    const query = carrier.data_source?.query;
    if (carrier.data_source?.type === 'esql' && query && !queries.includes(query)) {
      queries.push(query);
    }
  }
  return queries;
};

export const pickPanelKeys = (config: object): Record<string, unknown> => {
  const record = config as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const key of PANEL_KEYS) {
    if (key in record) {
      picked[key] = record[key];
    }
  }
  return picked;
};

export const unsupportedLensDataEditMessage = (panelId: string): string =>
  `Panel "${panelId}" is not an ES|QL Lens visualization. Presentation edits (title, hide_title, intent, style) work; data edits (regenerate_query) and chart-family changes do not.`;
