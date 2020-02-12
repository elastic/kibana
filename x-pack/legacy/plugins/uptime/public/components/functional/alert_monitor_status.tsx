/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import {
  EuiComboBox,
  EuiExpression,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  Option,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { KueryBar } from '../connected';


interface AlertMonitorStatusProps {
  autocomplete: any;
  enabled: boolean;
  filters?: string;
  locations: string[];
  numTimes: number;
  timerange: {
    from: string;
    to: string;
  };
}

interface AlertExpressionPopoverProps {
  content: React.ReactElement;
  description: string;
  id: string;
  value: string;
}

const AlertExpressionPopover: React.FC<AlertExpressionPopoverProps> = ({
  content,
  description,
  id,
  value,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  return (
    <EuiPopover
      id={id}
      button={
        <EuiExpression
          color={isOpen ? 'primary' : 'secondary'}
          description={description}
          isActive={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          value={value}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(!isOpen)}
    >
      {content}
    </EuiPopover>
  );
};

// WHEN ANY PING MATCHING [kql]
// IS [status] MORE THAN [numtimes] times
// WITHIN [timerange]
// IN [location option]

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = (
  props: AlertMonitorStatusProps
) => {
  console.log('props', props);
  const [numTimes, setNumTimes] = useState<number>(5);
  const [numMins, setNumMins] = useState<number>(15);
  const [allLabels, setAllLabels] = useState<boolean>(true);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [locations, setLocations] = useState<Option[]>(
    props.locations.map(l => ({
      disabled: allLabels,
      label: l,
    }))
  );
  const { setAlertParams } = props;
  setAlertParams('numTimes', numTimes);
  setAlertParams('timerange', { from: `now-${numMins}m`, to: 'now' });
  setAlertParams(
    'locations',
    locations.filter(l => l.checked === 'on').map(l => l.label)
  );
  console.log(
    `state:\nnumTimes: ${numTimes}\nnumMins: ${numMins}\nlocations: ${JSON.stringify(
      locations,
      null,
      2
    )}`
  );
  console.log(
    'the value',

    locations.length === 0 || allLabels
      ? 'all locations'
      : locations
          .filter(l => l.checked === 'on')
          .map(l => l.label)
          .sort()
          .reduce((acc, cur) => {
            if (acc === '') {
              return cur;
            }
            return acc + `, ${cur}`;
          }, '')
  );
  return (
    <>
      <KueryBar autocomplete={props.autocomplete} />

      <AlertExpressionPopover
        content={
          <EuiFieldNumber
            compressed
            value={numTimes}
            onChange={e => setNumTimes(parseInt(e.target.value, 10))}
          />
        }
        id="ping-count"
        description="any ping is down >"
        value={`${numTimes} times`}
      />

      <EuiSpacer size="xs" />

      <AlertExpressionPopover
        id="timerange"
        description="within"
        value={`last ${numMins} minutes`}
        content={
          <EuiFieldNumber
            compressed
            value={numMins}
            onChange={e => setNumMins(parseInt(e.target.value, 10))}
          />
        }
      />

      <EuiSpacer size="xs" />

      {locations.length === 0 && (
        <EuiExpression color="secondary" description="in" isActive={false} value="all locations" />
      )}

      <EuiSpacer size="xs" />

      {locations.length > 0 && (
        <AlertExpressionPopover
          id="locations"
          description="in"
          value={
            locations.length === 0 || allLabels
              ? 'all locations'
              : locations
                  .filter(l => l.checked === 'on')
                  .map(l => l.label)
                  .sort()
                  .reduce((acc, cur) => {
                    if (acc === '') {
                      return cur;
                    }
                    return acc + `, ${cur}`;
                  }, '')
          }
          content={
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiSwitch
                  label="Check all locations"
                  checked={allLabels}
                  onChange={() => {
                    setAllLabels(!allLabels);
                    setLocations(locations.map((l: Option) => ({ ...l, disabled: !allLabels })));
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelectable options={locations} onChange={e => setLocations(e)}>
                  {location => location}
                </EuiSelectable>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      )}
    </>
  );
};
