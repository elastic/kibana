/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsServiceSetup } from '@kbn/core-ui-settings-server';
import { DATA_FEDERATION_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';

/** Registers the advanced setting that controls the visibility of the data federation management app. */
export const registerUiSettings = ({
  uiSettings,
}: {
  uiSettings: UiSettingsServiceSetup;
}): void => {
  uiSettings.register({
    [DATA_FEDERATION_ENABLED_SETTING_ID]: {
      category: ['general'],
      name: i18n.translate('xpack.dataFederation.uiSettings.enabled.name', {
        defaultMessage: 'ES|QL Data Federation',
      }),
      description: i18n.translate('xpack.dataFederation.uiSettings.enabled.description', {
        defaultMessage:
          'Display the ES|QL Data Federation management UI. Disabling this setting does not affect existing data sources or datasets. You can continue to manage them through the API and reference datasets in ES|QL queries.',
      }),
      schema: schema.boolean(),
      value: false,
      requiresPageReload: true,
      technicalPreview: true,
    },
  });
};
