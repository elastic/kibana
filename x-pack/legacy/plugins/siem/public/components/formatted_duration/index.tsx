/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { getFormattedDurationString } from './helpers';
import { FormattedDurationTooltip } from './tooltip';

interface FormattedDurationProps {
  maybeDurationNanoseconds: string | number | object | undefined | null;
  tooltipTitle?: string;
}

export const FormattedDuration = React.memo<FormattedDurationProps>(
  ({ maybeDurationNanoseconds, tooltipTitle }) => (
    <FormattedDurationTooltip
      maybeDurationNanoseconds={maybeDurationNanoseconds}
      tooltipTitle={tooltipTitle}
    >
      <div data-test-subj="formatted-duration">
        {getFormattedDurationString(maybeDurationNanoseconds)}
      </div>
    </FormattedDurationTooltip>
  )
);

FormattedDuration.displayName = 'FormattedDuration';
