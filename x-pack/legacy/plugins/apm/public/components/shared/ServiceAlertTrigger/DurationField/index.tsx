/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiSelect
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  parseEsInterval,
  ParsedInterval
} from '../../../../../../../../../src/plugins/data/common';
import { getTimeUnitLabel } from '../../../../../../../../plugins/triggers_actions_ui/public';
import { TIME_UNITS } from '../../../../../../../../plugins/triggers_actions_ui/public';

interface Props {
  duration: string;
  onChange: (duration: string) => void;
}

export function DurationField(props: Props) {
  const { duration, onChange } = props;

  let parsedInterval: ParsedInterval | undefined;

  try {
    parsedInterval = parseEsInterval(duration);
  } catch (err) {
    // this will cause an error when the user clears the number input
  }

  const displayedUnit = useRef(parsedInterval?.unit);
  // we use a ref that we only update when we've succesfully parsed
  // the interval. this allows the user to clear the number input
  // without us having to fill it with a 0 in order for it to be
  // succesfully parsed.

  if (parsedInterval?.unit) {
    displayedUnit.current = parsedInterval?.unit;
  }

  const units = [
    TIME_UNITS.SECOND,
    TIME_UNITS.MINUTE,
    TIME_UNITS.HOUR,
    TIME_UNITS.DAY
  ];

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFieldNumber
          value={parsedInterval?.value ?? ''}
          onChange={e => onChange(`${e.target.value}${displayedUnit.current}`)}
          prepend={i18n.translate(
            'xpack.apm.serviceAlertTrigger.durationField.last',
            {
              defaultMessage: 'Last'
            }
          )}
          compressed
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          options={units.map(unit => ({
            text: getTimeUnitLabel(unit),
            value: unit
          }))}
          value={displayedUnit.current}
          onChange={e => onChange(`${parsedInterval?.value}${e.target.value}`)}
          compressed
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
