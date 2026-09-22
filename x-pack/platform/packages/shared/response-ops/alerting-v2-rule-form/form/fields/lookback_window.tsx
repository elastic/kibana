/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { DurationInput } from './duration_input';

const LOOKBACK_WINDOW_TITLE_PREFIX = i18n.translate(
  'xpack.alertingV2.ruleForm.lookbackWindow.titlePrefix',
  {
    defaultMessage: 'Last',
  }
);

const LOOKBACK_WINDOW_UNIT_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.ruleForm.lookbackWindow.unitAriaLabel',
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

export const LookbackWindow = React.forwardRef<HTMLInputElement, Props>((props, ref) => (
  <DurationInput
    {...props}
    ref={ref}
    fallback="5m"
    numberLabel={LOOKBACK_WINDOW_TITLE_PREFIX}
    unitAriaLabel={LOOKBACK_WINDOW_UNIT_ARIA_LABEL}
    dataTestSubj="lookbackWindow"
    idPrefix="lookbackWindow"
  />
));
