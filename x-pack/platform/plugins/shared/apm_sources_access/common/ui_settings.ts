/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import { i18n } from '@kbn/i18n';
import { OBSERVABILITY_APM_DATA_ACCESS_APM_SOURCES_ID } from '@kbn/management-settings-ids';
import { indicesSchema } from './config_schema';

/**
 * uiSettings definitions for the logs_data_access plugin.
 */
export const uiSettings: Record<string, UiSettingsParams> = {
  [OBSERVABILITY_APM_DATA_ACCESS_APM_SOURCES_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.apmSourcesAccess.apmSources', {
      defaultMessage: 'APM sources',
    }),
    description: i18n.translate('xpack.apmSourcesAccess.apmSourcesDescription', {
      defaultMessage: 'Sources to be used for apm data.',
    }),
    type: 'json',
    schema: indicesSchema,
    requiresPageReload: true,
    solution: 'oblt',
    readonly: true,
    readonlyMode: 'ui',
  },
};
