/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  useEuiTheme,
  EuiFormControlLayout,
  EuiIcon,
} from '@elastic/eui';
import { getSeverityRangeDisplay } from '../../../components/controls/select_severity/select_severity';
import { useSeverityLegendControlStyles } from './severity_legend_control_styles';
import type { SeverityOption } from '../../hooks/use_severity_options';

export interface SeverityControlProps {
  allSeverityOptions: SeverityOption[];
  selectedSeverities: SeverityOption[];
  onChange: (selectedSeverities: SeverityOption[]) => void;
  dataTestSubj?: string;
}

export const SeverityLegendControl: FC<SeverityControlProps> = ({
  allSeverityOptions,
  selectedSeverities,
  onChange,
  dataTestSubj = 'severity-legend-control',
}) => {
  const { euiTheme } = useEuiTheme();
  const styles = useSeverityLegendControlStyles();

  const handleSeverityClick = useCallback(
    (clickedSeverity: SeverityOption) => {
      const isCurrentlySelected = selectedSeverities.some(
        (severity) => severity.val === clickedSeverity.val
      );

      let newSelectedSeverities: SeverityOption[];
      if (isCurrentlySelected) {
        newSelectedSeverities = selectedSeverities.filter(
          (severity) => severity.val !== clickedSeverity.val
        );
      } else {
        newSelectedSeverities = [...selectedSeverities, clickedSeverity];
      }

      onChange(newSelectedSeverities);
    },
    [selectedSeverities, onChange]
  );

  const severityControl = (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {allSeverityOptions.map((severity) => {
        const isSelected = selectedSeverities.some((s) => s.val === severity.val);

        return (
          <EuiFlexItem key={severity.val} grow={false}>
            <EuiButtonEmpty
              size="xs"
              onClick={() => handleSeverityClick(severity)}
              css={styles.severityButton}
              data-test-subj={`${dataTestSubj}-item-${severity.val}`}
            >
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon
                    type={isSelected ? 'dot' : 'eyeClosed'}
                    color={isSelected ? severity.color : euiTheme.colors.textDisabled}
                    size={isSelected ? 'm' : 's'}
                  />
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText size="s" css={styles.severityText(isSelected)}>
                    {getSeverityRangeDisplay(severity.val)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiButtonEmpty>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );

  return (
    <EuiFormControlLayout
      compressed
      prepend="Anomaly score"
      fullWidth
      data-test-subj={dataTestSubj}
    >
      <EuiFlexItem css={styles.severityControl}>{severityControl}</EuiFlexItem>
    </EuiFormControlLayout>
  );
};
