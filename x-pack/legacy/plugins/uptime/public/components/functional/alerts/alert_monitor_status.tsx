/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiExpression,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiSwitch,
} from '@elastic/eui';
import { KueryBar } from '../../connected';

interface AlertMonitorStatusProps {
  autocomplete: any;
  enabled: boolean;
  filters?: string;
  locations: string[];
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
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
      anchorPosition="downLeft"
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

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = props => {
  const [numTimes, setNumTimes] = useState<number>(5);
  const [numMins, setNumMins] = useState<number>(15);
  const [allLabels, setAllLabels] = useState<boolean>(true);
  // locations is an array of `Option[]`, but that type doesn't seem to be exported by EUI
  const [locations, setLocations] = useState<any[]>(
    props.locations.map(location => ({
      disabled: allLabels,
      label: location,
    }))
  );

  const { setAlertParams } = props;

  useEffect(() => {
    setAlertParams('numTimes', numTimes);
  }, [numTimes, setAlertParams]);
  useEffect(() => {
    setAlertParams('timerange', { from: `now-${numMins}m`, to: 'now' });
  }, [numMins, setAlertParams]);
  useEffect(() => {
    setAlertParams(
      'locations',
      locations.filter(l => l.checked === 'on').map(l => l.label)
    );
  }, [locations, setAlertParams]);
  useEffect(() => {
    setAlertParams('filters', props.filters);
  }, [props.filters, setAlertParams]);

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
                    setLocations(locations.map((l: any) => ({ ...l, disabled: !allLabels })));
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
