/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { OptionalFieldLabel } from '../optional_field_label';
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
    labelAppend: OptionalFieldLabel,
    helpText: i18n.translate(
      'xpack.siem.detectionEngine.createRule.stepScheduleRule.fieldAdditionalLookBackHelpText',
      {
        defaultMessage:
          'Add more time to the look-back range in order to prevent potential gaps in signal reporting.',
      }
    ),
  },
};
