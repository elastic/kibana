/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useEuiTheme, EuiHealth } from '@elastic/eui';
import type { AppHeaderBadge } from '@kbn/app-header';
import { CaseSeverity } from '../../../common/types/domain';
import { CRITICAL, HIGH, LOW, MEDIUM } from './translations';

interface SeverityConfig {
  label: string;
  badgeColor: NonNullable<AppHeaderBadge['color']>;
}

interface Props {
  severity: CaseSeverity;
}

export const severities: Record<CaseSeverity, SeverityConfig> = {
  [CaseSeverity.LOW]: {
    label: LOW,
    badgeColor: 'default',
  },
  [CaseSeverity.MEDIUM]: {
    label: MEDIUM,
    badgeColor: 'warning',
  },
  [CaseSeverity.HIGH]: {
    label: HIGH,
    badgeColor: 'danger',
  },
  [CaseSeverity.CRITICAL]: {
    label: CRITICAL,
    badgeColor: 'danger',
  },
};

export const SeverityHealth: React.FC<Props> = ({ severity }) => {
  const { euiTheme } = useEuiTheme();

  const severityData = {
    low: {
      color: euiTheme.colors.severity.neutral,
      label: LOW,
    },
    medium: {
      color: euiTheme.colors.severity.warning,
      label: MEDIUM,
    },
    high: {
      color: euiTheme.colors.severity.risk,
      label: HIGH,
    },
    critical: {
      color: euiTheme.colors.severity.danger,
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
