/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* istanbul ignore file */

import { i18n } from '@kbn/i18n';

import { FormSchema } from '../../../../../shared_imports';

export const schema: FormSchema = {
  actions: {},
  enabled: {},
  kibanaSiemAppUrl: {},
  throttle: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepRuleActions.fieldThrottleLabel',
      {
        defaultMessage: 'Actions frequency',
      }
    ),
    helpText: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepRuleActions.fieldThrottleHelpText',
      {
        defaultMessage:
          'Select when automated actions should be performed if a rule evaluates as true.',
      }
    ),
  },
};
