/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsServiceSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { DATA_SOURCES_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

export const registerUISettings = ({ uiSettings }: { uiSettings: UiSettingsServiceSetup }) => {
  uiSettings.register({
    [DATA_SOURCES_ENABLED_SETTING_ID]: {
      description: i18n.translate('xpack.dataSources.uiSettings.description', {
        defaultMessage: 'Enable Data Sources',
      }),
      name: i18n.translate('xpack.dataSources.uiSettings.name', {
        defaultMessage: 'Data Sources',
      }),
      schema: schema.boolean(),
      value: false,
      technicalPreview: true,
      requiresPageReload: true,
      readonly: false,
    },
  });
};
