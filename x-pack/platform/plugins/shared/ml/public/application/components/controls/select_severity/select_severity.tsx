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
import React, { Fragment, useMemo } from 'react';

import type { EuiSuperSelectProps } from '@elastic/eui';
import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { usePageUrlState } from '@kbn/ml-url-state';
import { getSeverityColor, ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils';

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

const optionsMap = {
  [warningLabel]: ML_ANOMALY_THRESHOLD.LOW,
  [minorLabel]: ML_ANOMALY_THRESHOLD.MINOR,
  [majorLabel]: ML_ANOMALY_THRESHOLD.MAJOR,
  [criticalLabel]: ML_ANOMALY_THRESHOLD.CRITICAL,
};

export interface TableSeverityPageUrlState {
  pageKey: 'mlSelectSeverity';
  pageUrlState: TableSeverity;
}

export interface TableSeverity {
  val: number;
  display: string;
  color: string;
}

export const SEVERITY_OPTIONS: TableSeverity[] = [
  {
    val: ML_ANOMALY_THRESHOLD.LOW,
    display: warningLabel,
    color: getSeverityColor(ML_ANOMALY_THRESHOLD.LOW),
  },
  {
    val: ML_ANOMALY_THRESHOLD.MINOR,
    display: minorLabel,
    color: getSeverityColor(ML_ANOMALY_THRESHOLD.MINOR),
  },
  {
    val: ML_ANOMALY_THRESHOLD.MAJOR,
    display: majorLabel,
    color: getSeverityColor(ML_ANOMALY_THRESHOLD.MAJOR),
  },
  {
    val: ML_ANOMALY_THRESHOLD.CRITICAL,
    display: criticalLabel,
    color: getSeverityColor(ML_ANOMALY_THRESHOLD.CRITICAL),
  },
];

export function optionValueToThreshold(value: number) {
  // Get corresponding threshold object with required display and val properties from the specified value.
  let threshold = SEVERITY_OPTIONS.find((opt) => opt.val === value);

  // Default to warning if supplied value doesn't map to one of the options.
  if (threshold === undefined) {
    threshold = SEVERITY_OPTIONS[0];
  }

  return threshold;
}

const TABLE_SEVERITY_DEFAULT = SEVERITY_OPTIONS[0];

export const useTableSeverity = () => {
  return usePageUrlState<TableSeverityPageUrlState>('mlSelectSeverity', TABLE_SEVERITY_DEFAULT);
};

export const getSeverityOptions = () =>
  SEVERITY_OPTIONS.map(({ color, display, val }) => ({
    value: display,
    inputDisplay: (
      <Fragment>
        <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
          {display}
        </EuiHealth>
      </Fragment>
    ),
    dropdownDisplay: (
      <Fragment>
        <EuiHealth color={color} style={{ lineHeight: 'inherit' }}>
          {display}
        </EuiHealth>
        <EuiSpacer size="xs" />
        <EuiText size="xs" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ml.controls.selectSeverity.scoreDetailsDescription"
              defaultMessage="score {value} and above"
              values={{ value: val }}
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  }));

interface Props {
  classNames?: string;
}

export const SelectSeverity: FC<Props> = ({ classNames } = { classNames: '' }) => {
  const [severity, setSeverity] = useTableSeverity();

  return <SelectSeverityUI severity={severity} onChange={setSeverity} />;
};

export const SelectSeverityUI: FC<
  Omit<EuiSuperSelectProps<string>, 'onChange' | 'options'> & {
    classNames?: string;
    severity: TableSeverity;
    onChange: (s: TableSeverity) => void;
  }
> = ({ classNames = '', severity, onChange, compressed }) => {
  const handleOnChange = (valueDisplay: string) => {
    onChange(optionValueToThreshold(optionsMap[valueDisplay]));
  };

  const options = useMemo(() => {
    return getSeverityOptions();
  }, []);

  return (
    <EuiSuperSelect
      prepend={i18n.translate('xpack.ml.explorer.severityThresholdLabel', {
        defaultMessage: 'Severity',
      })}
      data-test-subj={'mlAnomalySeverityThresholdControls'}
      className={classNames}
      hasDividers
      options={options}
      valueOfSelected={severity.display}
      onChange={handleOnChange}
      compressed
    />
  );
};
