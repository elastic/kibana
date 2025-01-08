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

  const severities = {
    [CaseSeverity.LOW]: {
      color: euiTheme.flags.hasVisColorAdjustment ? '#54B399' : '#CAD3E2',
      label: i18n.SEVERITY_LOW_LABEL,
    },
    [CaseSeverity.MEDIUM]: {
      color: euiTheme.flags.hasVisColorAdjustment ? '#D6BF57' : '#FCD883',
      label: i18n.SEVERITY_MEDIUM_LABEL,
    },
    [CaseSeverity.HIGH]: {
      color: euiTheme.flags.hasVisColorAdjustment ? '#DA8B45' : '#FC9188',
      label: i18n.SEVERITY_HIGH_LABEL,
    },
    [CaseSeverity.CRITICAL]: {
      color: euiTheme.flags.hasVisColorAdjustment ? '#E7664C' : '#C61E25',
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
