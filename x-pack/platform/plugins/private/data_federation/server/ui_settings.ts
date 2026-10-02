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

// Mirrors the category identifier in `kbn-management/settings/utilities/category/const.ts`,
// a `shared-browser` package not consumable from plugin server code.
const DATA_FEDERATION_CATEGORY = 'dataFederation';

const DATA_FEDERATION_DOCUMENTATION_URL =
  'https://www.elastic.co/docs/reference/query-languages/esql/esql-data-federation';

/** Registers the advanced setting that controls the visibility of the data federation management app. */
export const registerUiSettings = ({
  uiSettings,
  isServerless,
}: {
  uiSettings: UiSettingsServiceSetup;
  isServerless: boolean;
}): void => {
  const licenseText = isServerless
    ? ''
    : i18n.translate('xpack.dataFederation.uiSettings.enabled.licenseText', {
        defaultMessage: 'Requires {license} license.',
        values: { license: '<b>enterprise</b>' },
      });

  uiSettings.registerGlobal({
    [DATA_FEDERATION_ENABLED_SETTING_ID]: {
      category: [DATA_FEDERATION_CATEGORY],
      name: i18n.translate('xpack.dataFederation.uiSettings.enabled.name', {
        defaultMessage: 'ES|QL Data Federation',
      }),
      description: i18n.translate('xpack.dataFederation.uiSettings.enabled.description', {
        defaultMessage:
          'Display the ES|QL Data Federation management UI. Disabling this setting does not affect existing data sources or datasets. You can continue to manage them through the API and reference datasets in ES|QL queries. {licenseText} {learnMoreLink}',
        values: {
          licenseText,
          learnMoreLink: `<a href="${DATA_FEDERATION_DOCUMENTATION_URL}" target="_blank" rel="noreferrer noopener">${i18n.translate(
            'xpack.dataFederation.uiSettings.enabled.learnMore',
            { defaultMessage: 'Learn more' }
          )}</a>.`,
        },
      }),
      schema: schema.boolean(),
      value: false,
      requiresPageReload: true,
      technicalPreview: true,
    },
  });
};
