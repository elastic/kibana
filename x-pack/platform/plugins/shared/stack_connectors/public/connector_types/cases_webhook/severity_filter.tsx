/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiSuperSelect,
  EuiSuperSelectOption,
  useEuiTheme,
} from '@elastic/eui';

import * as i18n from './translations';

export enum CaseSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

interface Props {
  selectedSeverity: CaseSeverity;
  onSeverityChange: (status: CaseSeverity) => void;
}

export const SeverityFilter: React.FC<Props> = ({ selectedSeverity, onSeverityChange }) => {
  const { euiTheme } = useEuiTheme();
  const isAmsterdam = euiTheme.flags.hasVisColorAdjustment;

  const severities = {
    [CaseSeverity.LOW]: {
      color: isAmsterdam ? euiTheme.colors.vis.euiColorVis0 : euiTheme.colors.severity.neutral,
      label: i18n.SEVERITY_LOW_LABEL,
    },
    [CaseSeverity.MEDIUM]: {
      color: isAmsterdam ? euiTheme.colors.vis.euiColorVis5 : euiTheme.colors.severity.warning,
      label: i18n.SEVERITY_MEDIUM_LABEL,
    },
    [CaseSeverity.HIGH]: {
      color: isAmsterdam ? euiTheme.colors.vis.euiColorVis7 : euiTheme.colors.severity.risk,
      label: i18n.SEVERITY_HIGH_LABEL,
    },
    [CaseSeverity.CRITICAL]: {
      color: isAmsterdam ? euiTheme.colors.vis.euiColorVis9 : euiTheme.colors.severity.danger,
      label: i18n.SEVERITY_CRITICAL_LABEL,
    },
  };
  const caseSeverities = Object.keys(severities) as CaseSeverity[];
  const options: Array<EuiSuperSelectOption<CaseSeverity>> = caseSeverities.map((severity) => {
    const severityData = severities[severity];
    return {
      value: severity,
      inputDisplay: (
        <EuiFlexGroup
          gutterSize="xs"
          alignItems={'center'}
          responsive={false}
          data-test-subj={`case-severity-selection-${severity}`}
        >
          <EuiFlexItem grow={false}>
            <EuiHealth color={severityData.color}>{severityData.label}</EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    };
  });

  return (
    <EuiSuperSelect
      fullWidth={true}
      options={options}
      valueOfSelected={selectedSeverity}
      onChange={onSeverityChange}
      data-test-subj="case-severity-selection"
    />
  );
};
SeverityFilter.displayName = 'SeverityFilter';
