/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup, EuiFieldNumber, EuiSelect, EuiFormRow } from '@elastic/eui';

enum TIME_UNITS {
  SECOND = 's',
  MINUTE = 'm',
  HOUR = 'h',
  DAY = 'd',
}
function getTimeUnitLabel(timeUnit = TIME_UNITS.SECOND, timeValue = '0') {
  switch (timeUnit) {
    case TIME_UNITS.SECOND:
      return i18n.translate('xpack.monitoring.alerts.flyoutExpressions.timeUnits.secondLabel', {
        defaultMessage: '{timeValue, plural, one {second} other {seconds}}',
        values: { timeValue },
      });
    case TIME_UNITS.MINUTE:
      return i18n.translate('xpack.monitoring.alerts.flyoutExpressions.timeUnits.minuteLabel', {
        defaultMessage: '{timeValue, plural, one {minute} other {minutes}}',
        values: { timeValue },
      });
    case TIME_UNITS.HOUR:
      return i18n.translate('xpack.monitoring.alerts.flyoutExpressions.timeUnits.hourLabel', {
        defaultMessage: '{timeValue, plural, one {hour} other {hours}}',
        values: { timeValue },
      });
    case TIME_UNITS.DAY:
      return i18n.translate('xpack.monitoring.alerts.flyoutExpressions.timeUnits.dayLabel', {
        defaultMessage: '{timeValue, plural, one {day} other {days}}',
        values: { timeValue },
      });
  }
}

// TODO: WHY does this not work?
// import { getTimeUnitLabel, TIME_UNITS } from '../../../triggers_actions_ui/public';

interface Props {
  name: string;
  duration: string;
  label: string;
  errors: string[];
  setRuleParams: (property: string, value: any) => void;
}

const parseRegex = /(\d+)([smhd]{1})/;
export const AlertParamDuration: React.FC<Props> = (props: Props) => {
  const { name, label, setRuleParams, errors } = props;
  const parsed = parseRegex.exec(props.duration);
  const defaultValue = parsed && parsed[1] ? parseInt(parsed[1], 10) : 1;
  const defaultUnit = parsed && parsed[2] ? parsed[2] : TIME_UNITS.MINUTE;
  const [value, setValue] = React.useState(defaultValue);
  const [unit, setUnit] = React.useState(defaultUnit);

  const timeUnits = Object.values(TIME_UNITS).map((timeUnit) => ({
    value: timeUnit,
    text: getTimeUnitLabel(timeUnit),
  }));

  React.useEffect(() => {
    setRuleParams(name, `${value}${unit}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, value]);

  return (
    <EuiFormRow label={label} error={errors} isInvalid={errors?.length > 0}>
      <EuiFlexGroup>
        <EuiFlexItem grow={2}>
          <EuiFieldNumber
            compressed
            value={value}
            onChange={(e) => {
              let newValue = parseInt(e.target.value, 10);
              if (isNaN(newValue)) {
                newValue = 0;
              }
              setValue(newValue);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiSelect
            compressed
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={timeUnits}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
};
