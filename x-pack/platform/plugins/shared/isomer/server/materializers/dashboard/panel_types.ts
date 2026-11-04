/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
} from '@kbn/controls-constants';
import type { MaterializeInput } from '../../../common';

/**
 * The saved object type each dashboard panel type shows, where they differ. Materializers are
 * registered by saved object type, so a panel materializes through the type it shows.
 */
const savedObjectTypeByPanelType: Readonly<Record<string, string>> = {
  vis: 'lens',
  discover_session: 'search',
  legacy_vis: 'visualization',
};

export const CONTROL_PANEL_TYPES: ReadonlySet<string> = new Set([
  ESQL_CONTROL,
  OPTIONS_LIST_CONTROL,
  RANGE_SLIDER_CONTROL,
  TIME_SLIDER_CONTROL,
]);

/** The saved object type, and so the materializer, for a dashboard panel type. */
export const savedObjectTypeForPanel = (panelType: string): string =>
  savedObjectTypeByPanelType[panelType] ?? panelType;

/**
 * What a panel materializes as: its saved object by ID when the panel is by reference (`ref_id`
 * in the as-code format), otherwise its config by value.
 */
export const panelInput = (
  panelType: string,
  config: Record<string, unknown>
): MaterializeInput => {
  const type = savedObjectTypeForPanel(panelType);
  const { ref_id: refId } = config;
  return typeof refId === 'string' && refId.length > 0 ? { type, id: refId } : { type, config };
};

const stringField = (config: Record<string, unknown>, key: string): string | undefined => {
  const value = config[key];
  return typeof value === 'string' ? value : undefined;
};

/** The panel's own title, as Kibana's panel header reads it: an empty title shows no header. */
export const panelTitle = (config: Record<string, unknown>): string | undefined =>
  stringField(config, 'title');

export const panelDescription = (config: Record<string, unknown>): string | undefined =>
  stringField(config, 'description') || undefined;

export const panelHidesTitle = (config: Record<string, unknown>): boolean =>
  config.hide_title === true;
