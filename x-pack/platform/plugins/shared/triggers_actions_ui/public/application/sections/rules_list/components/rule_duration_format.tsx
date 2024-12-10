/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiToolTip } from '@elastic/eui';
import { getFormattedDuration, getFormattedMilliseconds } from '../../../lib/monitoring_utils';

interface Props {
  duration: number;
  allowZero?: boolean;
}

export const RuleDurationFormat = memo((props: Props) => {
  const { duration, allowZero = true } = props;

  const formattedDuration = useMemo(() => {
    if (allowZero || typeof duration === 'number') {
      return getFormattedDuration(duration);
    }
    return 'N/A';
  }, [duration, allowZero]);

  const formattedTooltip = useMemo(() => {
    if (allowZero || typeof duration === 'number') {
      return getFormattedMilliseconds(duration);
    }
    return 'N/A';
  }, [duration, allowZero]);

  return (
    <EuiToolTip data-test-subj="rule-duration-format-tooltip" content={formattedTooltip}>
      <span data-test-subj="rule-duration-format-value">{formattedDuration}</span>
    </EuiToolTip>
  );
});
