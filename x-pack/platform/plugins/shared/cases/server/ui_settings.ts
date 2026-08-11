/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import {
  APP_ID,
  ABSOLUTE_MAX_CASES_PER_RUN,
  MAX_OPEN_CASES_DEFAULT_MAXIMUM,
  MAX_OPEN_CASES_ADVANCED_SETTING,
} from '../common/constants';

export const initUiSettings = (uiSettings: CoreSetup['uiSettings']) => {
  uiSettings.register({
    [MAX_OPEN_CASES_ADVANCED_SETTING]: {
      name: i18n.translate('xpack.cases.uiSettings.maxOpenCasesPerRuleRunLabel', {
        defaultMessage: 'Maximum cases created per rule run',
      }),
      value: MAX_OPEN_CASES_DEFAULT_MAXIMUM,
      type: 'number',
      description: i18n.translate('xpack.cases.uiSettings.maxOpenCasesPerRuleRunDescription', {
        defaultMessage:
          'Sets the maximum number of cases that the Cases connector can open during a single rule run.',
      }),
      category: [APP_ID],
      requiresPageReload: false,
      order: 0,
      schema: schema.number({ min: 1, max: ABSOLUTE_MAX_CASES_PER_RUN }),
    },
  });
};
