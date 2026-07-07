/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DurationInput } from './duration_input';

const SCHEDULE_TITLE_PREFIX = i18n.translate('xpack.alertingV2.ruleForm.schedule.titlePrefix', {
  defaultMessage: 'Every',
});

const SCHEDULE_UNIT_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.ruleForm.schedule.unitAriaLabel',
  {
    defaultMessage: 'Unit',
  }
);

interface Props {
  value: string;
  onChange: (value: string) => void;
  errors?: string;
  compressed?: boolean;
}

export const RuleSchedule = React.forwardRef<HTMLInputElement, Props>((props, ref) => (
  <DurationInput
    {...props}
    ref={ref}
    numberLabel={SCHEDULE_TITLE_PREFIX}
    unitAriaLabel={SCHEDULE_UNIT_ARIA_LABEL}
    dataTestSubj="ruleSchedule"
    idPrefix="ruleSchedule"
  />
));
