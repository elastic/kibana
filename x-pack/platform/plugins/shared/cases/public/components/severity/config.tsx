/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useEuiTheme, EuiHealth } from '@elastic/eui';
import { CaseSeverity } from '../../../common/types/domain';
import { CRITICAL, HIGH, LOW, MEDIUM } from './translations';

interface Props {
  severity: CaseSeverity;
}

export const severities = {
  [CaseSeverity.LOW]: {
    label: LOW,
  },
  [CaseSeverity.MEDIUM]: {
    label: MEDIUM,
  },
  [CaseSeverity.HIGH]: {
    label: HIGH,
  },
  [CaseSeverity.CRITICAL]: {
    label: CRITICAL,
  },
};

export const SeverityHealth: React.FC<Props> = ({ severity }) => {
  const { euiTheme } = useEuiTheme();
  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  const severityData = {
    low: {
      color: isAmsterdam ? euiTheme.colors.vis.euiColorVis0 : euiTheme.colors.severity.neutral,
      label: LOW,
    },
    medium: {
      color: isAmsterdam ? euiTheme.colors.vis.euiColorVis5 : euiTheme.colors.severity.warning,
      label: MEDIUM,
    },
    high: {
      color: isAmsterdam ? euiTheme.colors.vis.euiColorVis7 : euiTheme.colors.severity.risk,
      label: HIGH,
    },
    critical: {
      color: isAmsterdam ? euiTheme.colors.vis.euiColorVis9 : euiTheme.colors.severity.danger,
      label: CRITICAL,
    },
  };

  const { color, label } = severityData[severity];

  return (
    <EuiHealth color={color} data-test-subj={`case-table-column-severity-${severity}`}>
      {label}
    </EuiHealth>
  );
};
SeverityHealth.displayName = 'SeverityHealth';
