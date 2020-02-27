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
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
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
  const [timerangeUnitOptions, setTimerangeUnitOptions] = useState<any[]>([
    {
      key: 's',
      label: i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.seconds', {
        defaultMessage: 'Seconds',
      }),
    },
    {
      checked: 'on',
      key: 'm',
      label: i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.minutes', {
        defaultMessage: 'Minutes',
      }),
    },
    {
      key: 'h',
      label: i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.hours', {
        defaultMessage: 'Hours',
      }),
    },
    {
      key: 'd',
      label: i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.days', {
        defaultMessage: 'Hours',
      }),
    },
  ]);

  const { setAlertParams } = props;

  useEffect(() => {
    setAlertParams('numTimes', numTimes);
  }, [numTimes, setAlertParams]);

  useEffect(() => {
    const timerangeUnit = timerangeUnitOptions.find(({ checked }) => checked === 'on')?.key ?? 'm';
    setAlertParams('timerange', { from: `now-${numMins}${timerangeUnit}`, to: 'now' });
  }, [numMins, timerangeUnitOptions, setAlertParams]);

  useEffect(() => {
    if (allLabels) {
      setAlertParams('locations', []);
    } else {
      setAlertParams(
        'locations',
        locations.filter(l => l.checked === 'on').map(l => l.label)
      );
    }
  }, [locations, setAlertParams, allLabels]);

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
        description="any monitor is down >"
        value={`${numTimes} times`}
      />

      <EuiSpacer size="xs" />

      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <AlertExpressionPopover
            id="timerange"
            description="within"
            value={`last ${numMins}`}
            content={
              <EuiFieldNumber
                compressed
                value={numMins}
                onChange={e => setNumMins(parseInt(e.target.value, 10))}
              />
            }
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertExpressionPopover
            id="timerange-unit"
            description=""
            value={
              timerangeUnitOptions.find(({ checked }) => checked === 'on')?.label.toLowerCase() ??
              ''
            }
            content={
              <>
                <EuiTitle size="xxs">
                  <h5>
                    <FormattedMessage
                      id="xpack.uptime.alerts.monitorStatus.timerangeSelectionHeader"
                      defaultMessage="Select time range unit"
                    />
                  </h5>
                </EuiTitle>
                <EuiSelectable
                  options={timerangeUnitOptions}
                  onChange={newOptions => {
                    if (newOptions.reduce((acc, { checked }) => acc || checked === 'on', false)) {
                      setTimerangeUnitOptions(newOptions);
                    }
                  }}
                  singleSelection={true}
                  listProps={{
                    // this code tells the selectable which item should be highlighted as "active".
                    // the selectable component is very general, so some features require additional computation like this
                    activeOptionIndex: timerangeUnitOptions.reduce(
                      (acc, { checked }, ind) => (checked === 'on' ? ind : acc),
                      // if we pass -1 the component doesn't highlight any item. This shouldn't happen but
                      // the behavior will be acceptable in this case.
                      -1
                    ),
                    showIcons: true,
                  }}
                >
                  {list => list}
                </EuiSelectable>
              </>
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="xs" />

      {locations.length === 0 && (
        <EuiExpression color="secondary" description="in" isActive={false} value="all locations" />
      )}

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
