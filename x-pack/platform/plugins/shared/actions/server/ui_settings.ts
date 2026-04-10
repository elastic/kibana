/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { i18n } from '@kbn/i18n';
import { EARS_OAUTH_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { ActionsConfig } from './config';

export const registerUISettings = ({
  uiSettings,
  config,
}: {
  uiSettings: UiSettingsServiceSetup;
  config: ActionsConfig;
}) => {
  uiSettings.register({
    [EARS_OAUTH_ENABLED_SETTING_ID]: {
      name: i18n.translate('xpack.actions.uiSettings.earsOAuthEnabled.name', {
        defaultMessage: 'Enable EARS OAuth authentication',
      }),
      description: i18n.translate('xpack.actions.uiSettings.earsOAuthEnabled.description', {
        defaultMessage:
          'Enables the EARS OAuth flow as an authentication option in connectors (e.g. Google Drive).',
      }),
      schema: schema.boolean(),
      value: config.ears?.enabled ?? false,
      // only allow it to be set via kibana.yml
      readonly: true,
      readonlyMode: 'strict',
      technicalPreview: true,
      requiresPageReload: true,
      category: ['general'],
    },
  });
};
