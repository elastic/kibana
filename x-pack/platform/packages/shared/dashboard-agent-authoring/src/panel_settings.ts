/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  serializedTimeRangeSchema,
  serializedTitlesSchema,
} from '@kbn/presentation-publishing-schemas';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';

/**
 * Panel-level settings that sit beside a panel type's own keys in `config` and that no
 * panel builder writes. `title` and `description` are left out: builders own them and may
 * omit them on purpose (e.g. titleless metric panels).
 * `drilldowns` is listed by hand because its schema is built at runtime.
 */
export const PANEL_SETTINGS_KEYS: readonly string[] = [
  ...Object.keys(serializedTitlesSchema.omit({ title: true, description: true }).shape),
  ...Object.keys(serializedTimeRangeSchema.shape),
  'drilldowns',
];

/** Picks the panel-level settings set on a panel config, so edits can carry them over. */
export const pickPanelSettings = (config: AttachmentPanel['config']): AttachmentPanel['config'] =>
  Object.fromEntries(
    PANEL_SETTINGS_KEYS.filter((key) => config[key] !== undefined).map((key) => [key, config[key]])
  );
