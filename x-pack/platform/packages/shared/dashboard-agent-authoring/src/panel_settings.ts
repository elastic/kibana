/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
  type SerializedTimeRange,
  type SerializedTitles,
} from '@kbn/presentation-publishing-schemas';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';

export type PanelLevelKey = keyof SerializedTitles | keyof SerializedTimeRange | 'drilldowns';

/**
 * Panel-level keys that sit beside a panel type's own keys in `config`.
 * `drilldowns` is listed by hand because its schema is built at runtime.
 */
export const PANEL_LEVEL_KEYS: readonly PanelLevelKey[] = [
  ...(Object.keys(serializedTitlesSchema.shape) as Array<keyof SerializedTitles>),
  ...(Object.keys(serializedTimeRangeSchema.shape) as Array<keyof SerializedTimeRange>),
  'drilldowns',
];

/** Returns the panel-level keys a config schema accepts, so a panel kind can declare what it writes. */
export const getPanelLevelKeysIn = (shape: object): readonly PanelLevelKey[] =>
  PANEL_LEVEL_KEYS.filter((key) => key in shape);

/** Picks the given panel-level keys set on a panel config. */
export const pickPanelLevelKeys = (
  config: AttachmentPanel['config'],
  keys: readonly PanelLevelKey[]
): AttachmentPanel['config'] =>
  Object.fromEntries(
    keys.filter((key) => config[key] !== undefined).map((key) => [key, config[key]])
  );
