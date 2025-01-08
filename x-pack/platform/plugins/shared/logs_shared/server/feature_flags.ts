/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_LOGS_SHARED_NEW_LOGS_OVERVIEW_ID } from '@kbn/management-settings-ids';

const technicalPreviewLabel = i18n.translate('xpack.logsShared.technicalPreviewSettingLabel', {
  defaultMessage: 'Technical Preview',
});

export const featureFlagUiSettings: Record<string, UiSettingsParams> = {
  [OBSERVABILITY_LOGS_SHARED_NEW_LOGS_OVERVIEW_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.logsShared.newLogsOverviewSettingName', {
      defaultMessage: 'New logs overview',
    }),
    value: false,
    description: i18n.translate('xpack.logsShared.newLogsOverviewSettingDescription', {
      defaultMessage: '{technicalPreviewLabel} Enable the new logs overview experience.',

      values: { technicalPreviewLabel: `<em>[${technicalPreviewLabel}]</em>` },
    }),
    type: 'boolean',
    schema: schema.boolean(),
    requiresPageReload: true,
  },
};
