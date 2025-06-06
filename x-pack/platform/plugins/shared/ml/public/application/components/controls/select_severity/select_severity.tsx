/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering a select element with threshold levels.
 */
import type { FC } from 'react';
import React, { Fragment, useMemo, useCallback } from 'react';

import type { EuiSelectableOption, EuiSuperSelectProps } from '@elastic/eui';
import { EuiHealth, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { usePageUrlState } from '@kbn/ml-url-state';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';
import type { SeverityThreshold } from '../../../../../common/types/anomalies';
import { MultiSuperSelect } from '../../multi_super_select/multi_super_select';

const warningLabel: string = i18n.translate('xpack.ml.controls.selectSeverity.warningLabel', {
  defaultMessage: 'warning',
});
const minorLabel: string = i18n.translate('xpack.ml.controls.selectSeverity.minorLabel', {
  defaultMessage: 'minor',
});
const majorLabel: string = i18n.translate('xpack.ml.controls.selectSeverity.majorLabel', {
  defaultMessage: 'major',
});
const criticalLabel: string = i18n.translate('xpack.ml.controls.selectSeverity.criticalLabel', {
  defaultMessage: 'critical',
});

const lowLabel: string = i18n.translate('xpack.ml.controls.selectSeverity.lowLabel', {
  defaultMessage: 'low',
});

export interface TableSeverityPageUrlState {
  pageKey: 'mlSelectSeverity';
  pageUrlState: TableSeverityState;
}

export interface TableSeverity {
  val: number;
  display: string;
  color: string;
  threshold: SeverityThreshold;
}

export interface TableSeverityState {
  val: SeverityThreshold[];
}

/**
 * React hook that returns severity options with their display values and colors
 */
export const useSeverityOptions = (): TableSeverity[] => {
  const { euiTheme } = useEuiTheme();

  return useMemo(
    () => [
      {
        val: ML_ANOMALY_THRESHOLD.LOW,
        display: lowLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.LOW),
        // TODO: SKY20
        color: '#CFEEF7',
        threshold: {
          min: ML_ANOMALY_THRESHOLD.LOW,
          max: ML_ANOMALY_THRESHOLD.WARNING,
        },
      },
      {
        val: ML_ANOMALY_THRESHOLD.WARNING,
        display: warningLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.WARNING),
        // TODO: SKY40
        color: '#94D8EB',
        threshold: {
          min: ML_ANOMALY_THRESHOLD.WARNING,
          max: ML_ANOMALY_THRESHOLD.MINOR,
        },
      },
      {
        val: ML_ANOMALY_THRESHOLD.MINOR,
        display: minorLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.MINOR),
        color: euiTheme.colors.severity.warning,
        threshold: {
          min: ML_ANOMALY_THRESHOLD.MINOR,
          max: ML_ANOMALY_THRESHOLD.MAJOR,
        },
      },
      {
        val: ML_ANOMALY_THRESHOLD.MAJOR,
        display: majorLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.MAJOR),
        color: euiTheme.colors.severity.risk,
        threshold: {
          min: ML_ANOMALY_THRESHOLD.MAJOR,
          max: ML_ANOMALY_THRESHOLD.CRITICAL,
        },
      },
      {
        val: ML_ANOMALY_THRESHOLD.CRITICAL,
        display: criticalLabel,
        rangeDisplay: getSeverityRangeDisplay(ML_ANOMALY_THRESHOLD.CRITICAL),
        color: euiTheme.colors.severity.danger,
        threshold: {
          min: ML_ANOMALY_THRESHOLD.CRITICAL,
        },
      },
    ],
    [
      euiTheme.colors.severity.danger,
      euiTheme.colors.severity.risk,
      euiTheme.colors.severity.warning,
    ]
  );
};

/**
 * React hook that returns a function to find a severity option by value
 */
export const useThresholdToSeverity = () => {
  const severityOptions = useSeverityOptions();

  return useMemo(() => {
    return (thresholds: SeverityThreshold[] | number) => {
      // Handle legacy case where threshold is a single number
      if (typeof thresholds === 'number') {
        // Find all severity options with min value >= the provided threshold
        const matchingSeverities = severityOptions.filter(
          (severity) => severity.threshold.min >= thresholds
        );

        // Default to lowest severity if no matches found
        if (matchingSeverities.length === 0) {
          return [severityOptions[0]];
        }

        return matchingSeverities;
      }

      // Handle the new format with threshold objects
      // Get corresponding severity objects that match the thresholds
      const matchingSeverities = severityOptions.filter((severity) =>
        thresholds.some(
          (threshold) =>
            threshold.min === severity.threshold.min && threshold.max === severity.threshold.max
        )
      );
      // Default to lowest severity if no matches found
      if (matchingSeverities.length === 0) {
        return [severityOptions[0]];
      }

      return matchingSeverities;
    };
  }, [severityOptions]);
};

/**
 * React hook that returns the default table severity state
 */
export const useTableSeverityDefault = () => {
  const severityOptions = useSeverityOptions();
  return useMemo(
    () => ({
      val: [severityOptions[0].threshold],
    }),
    [severityOptions]
  );
};

/**
 * React hook that provides table severity url state management
 */
export const useTableSeverity = () => {
  const defaultSeverity = useTableSeverityDefault();
  return usePageUrlState<TableSeverityPageUrlState>('mlSelectSeverity', defaultSeverity);
};

/**
 * Helper function to get severity range display value
 */
export const getSeverityRangeDisplay = (val: number): string => {
  switch (val) {
    case ML_ANOMALY_THRESHOLD.CRITICAL:
      return '75-100';
    case ML_ANOMALY_THRESHOLD.MAJOR:
      return '50-75';
    case ML_ANOMALY_THRESHOLD.MINOR:
      return '25-50';
    case ML_ANOMALY_THRESHOLD.WARNING:
      return '3-25';
    case ML_ANOMALY_THRESHOLD.LOW:
      return '0-3';
    default:
      return val.toString();
  }
};

export const useFormattedSeverityOptions = (selectedSeverities: TableSeverity[] = []) => {
  const severityOptions = useSeverityOptions();

  return useMemo<EuiSelectableOption[]>(() => {
    return severityOptions.map(({ color, val }) => {
      return {
        key: val.toString(),
        label: getSeverityRangeDisplay(val),
        prepend: <EuiHealth color={color} css={{ lineHeight: 'inherit' }} />,
        checked: selectedSeverities.some((severity) => severity.val === val) ? 'on' : undefined,
      };
    });
  }, [severityOptions, selectedSeverities]);
};

interface Props {
  classNames?: string;
}

export const SelectSeverity: FC<Props> = ({ classNames } = { classNames: '' }) => {
  const [severity, setSeverity] = useTableSeverity();
  // Get the selected severities from the state
  const selectedThresholds = severity.val || [];

  // Update the severity state with new selections
  const handleSeverityChange = useCallback(
    (newSelectedSeverities: TableSeverity[]) => {
      // Extract the thresholds from the selected severities
      const newSelectedThresholds = newSelectedSeverities.map((s) => s.threshold);

      setSeverity({
        val: newSelectedThresholds,
      });
    },
    [setSeverity]
  );

  return (
    <SelectSeverityUI
      severity={selectedThresholds}
      onChange={handleSeverityChange}
      classNames={classNames}
    />
  );
};

export const SelectSeverityUI: FC<
  Omit<EuiSuperSelectProps<string>, 'onChange' | 'options'> & {
    classNames?: string;
    severity: SeverityThreshold[];
    onChange: (selectedSeverities: TableSeverity[]) => void;
  }
> = ({ classNames = '', severity, onChange }) => {
  const allSeverityOptions = useSeverityOptions();
  const selectedSeverities = useMemo(
    () =>
      allSeverityOptions.filter((option) =>
        severity.some(
          (threshold) =>
            threshold.min === option.threshold.min && threshold.max === option.threshold.max
        )
      ),
    [allSeverityOptions, severity]
  );

  // Create a display string for the selected severities
  const inputDisplay = useMemo(() => {
    if (severity.length === 0) {
      return i18n.translate('xpack.ml.controls.selectSeverity.noneSelected', {
        defaultMessage: 'None selected',
      });
    }

    if (severity.length === 1) {
      const selectedSeverity = selectedSeverities[0];
      if (selectedSeverity && typeof selectedSeverity.val === 'number') {
        const rangeDisplay = getSeverityRangeDisplay(selectedSeverity.val);
        return (
          <Fragment>
            <EuiHealth color={selectedSeverity.color} css={{ lineHeight: 'inherit' }}>
              {rangeDisplay}
            </EuiHealth>
          </Fragment>
        );
      }
    }

    // For multiple selections, show "Multiple" with horizontally overlapping health icons
    return (
      <Fragment>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              marginRight: '8px',
              position: 'relative',
              height: '10px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {selectedSeverities.map((selectedSeverity, index) => (
              <div
                key={index}
                style={{
                  position: 'relative',
                  marginLeft: index > 0 ? '-6px' : '0',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: selectedSeverity.color,
                  zIndex: index + 1,
                }}
              />
            ))}
          </div>
          {i18n.translate('xpack.ml.controls.selectSeverity.multiple', {
            defaultMessage: 'Multiple',
          })}
        </div>
      </Fragment>
    );
  }, [selectedSeverities, severity]);

  // Get the options for the multi-select component
  const multiSelectOptions = useFormattedSeverityOptions(selectedSeverities);

  // Handle changes from the multi-select component
  const handleOptionsChange = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      // Get the keys of selected options
      const selectedOptionKeys = newOptions
        .filter((option) => option.checked === 'on')
        .map((option) => option.key);

      // Find the corresponding severity options
      const newSelectedSeverities = allSeverityOptions.filter((option) =>
        selectedOptionKeys.includes(option.val.toString())
      );

      onChange(newSelectedSeverities);
    },
    [onChange, allSeverityOptions]
  );

  return (
    <div data-test-subj={'mlAnomalySeverityThresholdControls'} className={classNames}>
      <MultiSuperSelect
        prepend={i18n.translate('xpack.ml.explorer.severityThresholdLabel', {
          defaultMessage: 'Anomaly Score',
        })}
        inputDisplay={inputDisplay}
        options={multiSelectOptions}
        onOptionsChange={handleOptionsChange}
      />
    </div>
  );
};
