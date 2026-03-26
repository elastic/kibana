/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { CoreSetup } from '@kbn/core/server';
import { ELASTIC_CONSOLE_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

export const registerUiSettings = (core: CoreSetup) => {
  core.uiSettings.register({
    [ELASTIC_CONSOLE_ENABLED_SETTING_ID]: {
      category: ['general'],
      name: i18n.translate('xpack.elasticConsole.enabledSettingName', {
        defaultMessage: 'Elastic Console',
      }),
      value: false,
      description: i18n.translate('xpack.elasticConsole.enabledSettingDescription', {
        defaultMessage:
          'Enable the Elastic Console proxy endpoints that allow external tools to use Kibana-configured AI connectors via an OpenAI-compatible API.',
      }),
      type: 'boolean',
      schema: schema.boolean(),
      requiresPageReload: false,
      technicalPreview: true,
    },
  });
};
