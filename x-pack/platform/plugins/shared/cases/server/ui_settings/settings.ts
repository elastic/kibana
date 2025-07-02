/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';
import { CASES_UI_SETTING_ID_DISPLAY_INCREMENTAL_ID } from '../../common/constants';

/**
 * Configuration for the kibana advanced settings related to cases.
 */

export const ADVANCED_SETTINGS_CONFIG = {
  [CASES_UI_SETTING_ID_DISPLAY_INCREMENTAL_ID]: {
    description: i18n.translate('xpack.cases.uiSettings.displayIncrementalId.description', {
      defaultMessage: 'Display the incremental id of a case in the relevant pages',
    }),
    name: i18n.translate('xpack.cases.uiSettings.displayIncrementalId.name', {
      defaultMessage: 'Show incremental id',
    }),
    schema: schema.boolean(),
    value: false,
    readonly: false,
    category: ['cases'],
  },
};
