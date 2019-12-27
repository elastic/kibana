/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * React component for rendering a select element with threshold levels.
 */
import React, { Fragment, FC } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiText } from '@elastic/eui';

import { getSeverityColor } from '../../../../../common/util/anomaly_utils';
import { useUrlState } from '../../../util/url_state';

const warningLabel = i18n.translate('xpack.ml.controls.selectSeverity.warningLabel', {
  defaultMessage: 'warning',
});
const minorLabel = i18n.translate('xpack.ml.controls.selectSeverity.minorLabel', {
  defaultMessage: 'minor',
});
const majorLabel = i18n.translate('xpack.ml.controls.selectSeverity.majorLabel', {
  defaultMessage: 'major',
});
const criticalLabel = i18n.translate('xpack.ml.controls.selectSeverity.criticalLabel', {
  defaultMessage: 'critical',
});

const optionsMap = {
  [warningLabel]: 0,
  [minorLabel]: 25,
  [majorLabel]: 50,
  [criticalLabel]: 75,
};

interface TableSeverity {
  val: number;
  display: string;
  color: string;
}

export const SEVERITY_OPTIONS: TableSeverity[] = [
  {
    val: 0,
    display: warningLabel,
    color: getSeverityColor(0),
  },
  {
    val: 25,
    display: minorLabel,
    color: getSeverityColor(25),
  },
  {
    val: 50,
    display: majorLabel,
    color: getSeverityColor(50),
  },
  {
    val: 75,
    display: criticalLabel,
    color: getSeverityColor(75),
  },
];

function optionValueToThreshold(value: number) {
  // Get corresponding threshold object with required display and val properties from the specified value.
  let threshold = SEVERITY_OPTIONS.find(opt => opt.val === value);

  // Default to warning if supplied value doesn't map to one of the options.
  if (threshold === undefined) {
    threshold = SEVERITY_OPTIONS[0];
  }

  return threshold;
}

const TABLE_SEVERITY_DEFAULT = SEVERITY_OPTIONS[0];
const TABLE_SEVERITY_APP_STATE_NAME = 'mlSelectSeverity';

export const useTableSeverity = () => {
  const [appState, setAppState] = useUrlState('_a');

  return [
    (appState && appState[TABLE_SEVERITY_APP_STATE_NAME]) || TABLE_SEVERITY_DEFAULT,
    (d: TableSeverity) => setAppState(TABLE_SEVERITY_APP_STATE_NAME, d),
  ];
};

const getSeverityOptions = () =>
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
          <p className="euiTextColor--subdued">
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
  classNames: string;
}

export const SelectSeverity: FC<Props> = ({ classNames } = { classNames: '' }) => {
  const [severity, setSeverity] = useTableSeverity();

  const onChange = (valueDisplay: string) => {
    setSeverity(optionValueToThreshold(optionsMap[valueDisplay]));
  };

  return (
    <EuiSuperSelect
      className={classNames}
      hasDividers
      options={getSeverityOptions()}
      valueOfSelected={severity.display}
      onChange={onChange}
    />
  );
};
