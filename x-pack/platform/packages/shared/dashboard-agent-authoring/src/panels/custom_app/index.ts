/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  appDocumentSchema,
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_STATE_VERSION,
  MAX_HEADING_LENGTH,
} from '@kbn/custom-app-common';
import { z } from '@kbn/zod/v4';
import { defineConfigPanelKind } from '../panel_kind';

/**
 * Custom app panel logic.
 *
 * A custom app is authored by value: `source: 'config'` (`type: 'custom_app'`). Its `config` is the
 * app document, and the panel's state version is added here so the agent does not have to know it.
 * The app is the one built in the conversation, templates included: there is nothing to resolve.
 */
const customAppPanelConfigSchema = z.object({
  title: z.string().max(MAX_HEADING_LENGTH).optional().describe('Title of the panel.'),
  document: appDocumentSchema.describe(
    'The app, exactly as it was created with custom_app_create_app: its "state" and its "root", with every custom content template already written.'
  ),
});

/**
 * The custom app variant of `config`-source panel content, discriminated by `type: 'custom_app'`.
 * It creates a panel, or edits one by its key, in which case the app is replaced as a whole.
 */
const customAppPanelContentSchema = z.object({
  source: z.literal('config'),
  type: z.literal('custom_app'),
  config: customAppPanelConfigSchema.describe(
    'Custom app panel config: { title?, document }. On an existing panel, fully replaces the app, so pass the whole document.'
  ),
});

export const customAppPanelKind = defineConfigPanelKind({
  type: 'custom_app',
  embeddableType: CUSTOM_APP_EMBEDDABLE_TYPE,
  label: 'custom app',
  contentSchema: customAppPanelContentSchema,
  toEmbeddableConfig: (config) => ({ ...config, version: CUSTOM_APP_STATE_VERSION }),
});
