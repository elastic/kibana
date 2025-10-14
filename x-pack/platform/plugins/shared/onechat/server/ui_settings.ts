/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

export const registerUISettings = ({ uiSettings }: { uiSettings: UiSettingsServiceSetup }) => {
  uiSettings.register({
    [AGENT_BUILDER_ENABLED_SETTING_ID]: {
      description: i18n.translate('xpack.onechat.uiSettings.feature.description', {
        defaultMessage: 'Enables Elastic Agent Builder.',
      }),
      name: i18n.translate('xpack.onechat.uiSettings.feature.name', {
        defaultMessage: 'Elastic Agent Builder',
      }),
      schema: schema.boolean(),
      value: false,
      technicalPreview: true,
      requiresPageReload: true,
      readonly: false,
    },
  });
};
