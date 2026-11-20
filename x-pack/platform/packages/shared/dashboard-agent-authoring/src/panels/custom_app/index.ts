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
import { z, lazySchema } from '@kbn/zod/v4';
import { defineConfigPanelKind } from '../panel_kind';

/**
 * Custom app panel logic.
 *
 * A custom app is authored by value: `type: 'custom_app'` content whose `config` is the app
 * document, and the panel's state version is added here so the agent does not have to know it.
 * The app is the one built in the conversation, templates included: there is nothing to resolve.
 */

const customAppPanelConfigSchema = lazySchema(() =>
  z.object({
    title: z.string().max(MAX_HEADING_LENGTH).optional().describe('Title of the panel.'),
    document: appDocumentSchema.describe(
      'The app, exactly as it was created with custom_app_create_app: its "state" and its "root", with every custom content template already written.'
    ),
  })
);

/** The custom app member of the panel content union. It creates a panel, or replaces the app of one. */
const customAppPanelContentSchema = lazySchema(() =>
  z.object({
    type: z.literal('custom_app'),
    config: customAppPanelConfigSchema.describe(
      'Custom app panel config: { title?, document }. On an existing panel, fully replaces the app, so pass the whole document.'
    ),
  })
);

const customAppGuidance = `A custom app is an interactive panel with filters, charts, tables and details, built in this conversation with \`custom_app_create_app\`. When the user asks to put one on the dashboard, add a panel with \`type: "custom_app"\` and \`config: { title?, document }\`, where \`document\` is the app exactly as it was created: read it from the app's attachment and pass it unchanged. Do not rebuild an app as separate panels, and do not write one by hand here. To change an app, change it with \`custom_app_update_app\` first, then replace the panel by its id with new content of the same kind. Layout is arranged for you and sizes it full width and tall; only set \`layout\` if the user asked for another arrangement.`;

export const customAppPanelKind = defineConfigPanelKind({
  type: 'custom_app',
  embeddableType: CUSTOM_APP_EMBEDDABLE_TYPE,
  label: 'custom app',
  selection: {
    priority: 5,
    whenToUse:
      'an interactive app with filters, charts and tables that work together, built in this conversation with `custom_app_create_app`.',
  },
  guidance: customAppGuidance,
  contentSchema: customAppPanelContentSchema,
  execute: (config) => ({
    panelContent: {
      type: CUSTOM_APP_EMBEDDABLE_TYPE,
      config: { ...config, version: CUSTOM_APP_STATE_VERSION },
    },
  }),
});
