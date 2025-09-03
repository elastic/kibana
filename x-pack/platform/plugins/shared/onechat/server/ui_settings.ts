/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { i18n } from '@kbn/i18n';
import { ONECHAT_FEATURE_SETTING_ID } from '../common/constants';

export const registerUISettings = ({ uiSettings }: { uiSettings: UiSettingsServiceSetup }) => {
  uiSettings.register({
    [ONECHAT_FEATURE_SETTING_ID]: {
      description: i18n.translate('xpack.onechat.uiSettings.feature.description', {
        defaultMessage: 'Enables Elastic Agent Builder.',
      }),
      name: i18n.translate('xpack.onechat.uiSettings.feature.name', {
        defaultMessage: 'Elastic Agent Builder',
      }),
      schema: schema.boolean(),
      value: false,
      readonly: true,
      readonlyMode: 'ui',
      technicalPreview: true,
      requiresPageReload: true,
    },
  });
};
