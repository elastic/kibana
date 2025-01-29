/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { SETTING_CATEGORY } from '@kbn/presentation-util-plugin/server';
import { UiSettingsParams } from '@kbn/core/types';
import { UI_SETTINGS } from '../common';

/**
 * uiSettings definitions for Presentation Util.
 */
export const getUISettings = (): Record<string, UiSettingsParams<boolean>> => ({
  [UI_SETTINGS.ENABLE_LABS_UI]: {
    name: i18n.translate('xpack.canvas.labs.enableUI', {
      defaultMessage: 'Enable labs button in Canvas',
    }),
    description: i18n.translate('xpack.canvas.labs.enableLabsDescription', {
      defaultMessage:
        'This flag determines if the viewer has access to the Labs button, a quick way to enable and disable technical preview features in Canvas.',
    }),
    value: false,
    type: 'boolean',
    schema: schema.boolean(),
    category: [SETTING_CATEGORY],
    requiresPageReload: true,
  },
});
