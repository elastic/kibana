/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiText } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

import * as RuleI18n from '../../translations';
import { FormSchema } from '../shared_imports';

export const schema: FormSchema = {
  interval: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepScheduleRule.fieldIntervalLabel',
      {
        defaultMessage: 'Rule run interval & look-back',
      }
    ),
    helpText: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepScheduleRule.fieldIntervalHelpText',
      {
        defaultMessage: 'How often and how far back this rule will search specified indices.',
      }
    ),
  },
  from: {
    label: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepScheduleRule.fieldAdditionalLookBackLabel',
      {
        defaultMessage: 'Additional look-back',
      }
    ),
    labelAppend: <EuiText size="xs">{RuleI18n.OPTIONAL_FIELD}</EuiText>,
    helpText: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepScheduleRule.fieldAdditionalLookBackHelpText',
      {
        defaultMessage:
          'Add more time to the look-back range in order to prevent potential gaps in signal reporting.',
      }
    ),
  },
};
