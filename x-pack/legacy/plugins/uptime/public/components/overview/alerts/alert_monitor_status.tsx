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
import { DataPublicPluginSetup } from 'src/plugins/data/public';
import { KueryBar } from '..';

interface AlertFieldNumberProps {
  'aria-label': string;
  'data-test-subj': string;
  disabled: boolean;
  fieldValue: number;
  setFieldValue: React.Dispatch<React.SetStateAction<number>>;
}

export const handleAlertFieldNumberChange = (
  e: React.ChangeEvent<HTMLInputElement>,
  isInvalid: boolean,
  setIsInvalid: React.Dispatch<React.SetStateAction<boolean>>,
  setFieldValue: React.Dispatch<React.SetStateAction<number>>
) => {
  const num = parseInt(e.target.value, 10);
  if (isNaN(num) || num < 1) {
    setIsInvalid(true);
  } else {
    if (isInvalid) setIsInvalid(false);
    setFieldValue(num);
  }
};

export const AlertFieldNumber = ({
  'aria-label': ariaLabel,
  'data-test-subj': dataTestSubj,
  disabled,
  fieldValue,
  setFieldValue,
}: AlertFieldNumberProps) => {
  const [isInvalid, setIsInvalid] = useState<boolean>(false);

  return (
    <EuiFieldNumber
      aria-label={ariaLabel}
      compressed
      data-test-subj={dataTestSubj}
      min={1}
      onChange={e => handleAlertFieldNumberChange(e, isInvalid, setIsInvalid, setFieldValue)}
      disabled={disabled}
      value={fieldValue}
      isInvalid={isInvalid}
    />
  );
};

interface AlertExpressionPopoverProps {
  'aria-label': string;
  content: React.ReactElement;
  description: string;
  'data-test-subj': string;
  id: string;
  value: string;
}

const AlertExpressionPopover: React.FC<AlertExpressionPopoverProps> = ({
  'aria-label': ariaLabel,
  content,
  'data-test-subj': dataTestSubj,
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
          aria-label={ariaLabel}
          color={isOpen ? 'primary' : 'secondary'}
          data-test-subj={dataTestSubj}
          description={description}
          isActive={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          value={value}
        />
      }
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
    >
      {content}
    </EuiPopover>
  );
};

export const selectedLocationsToString = (selectedLocations: any[]) =>
  // create a nicely-formatted description string for all `on` locations
  selectedLocations
    .filter(({ checked }) => checked === 'on')
    .map(({ label }) => label)
    .sort()
    .reduce((acc, cur) => {
      if (acc === '') {
        return cur;
      }
      return acc + `, ${cur}`;
    }, '');

interface AlertMonitorStatusProps {
  autocomplete: DataPublicPluginSetup['autocomplete'];
  enabled: boolean;
  filters: string;
  locations: string[];
  numTimes: number;
  setAlertParams: (key: string, value: any) => void;
  timerange: {
    from: string;
    to: string;
  };
}

export const AlertMonitorStatusComponent: React.FC<AlertMonitorStatusProps> = props => {
  const { filters, locations } = props;
  const [numTimes, setNumTimes] = useState<number>(5);
  const [numMins, setNumMins] = useState<number>(15);
  const [allLabels, setAllLabels] = useState<boolean>(true);

  // locations is an array of `Option[]`, but that type doesn't seem to be exported by EUI
  const [selectedLocations, setSelectedLocations] = useState<any[]>(
    locations.map(location => ({
      'aria-label': i18n.translate('xpack.uptime.alerts.locationSelectionItem.ariaLabel', {
        defaultMessage: 'Location selection item for "{location}"',
        values: {
          location,
        },
      }),
      disabled: allLabels,
      label: location,
    }))
  );
  const [timerangeUnitOptions, setTimerangeUnitOptions] = useState<any[]>([
    {
      'aria-label': i18n.translate(
        'xpack.uptime.alerts.timerangeUnitSelectable.secondsOption.ariaLabel',
        {
          defaultMessage: '"Seconds" time range select item',
        }
      ),
      'data-test-subj': 'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.secondsOption',
      key: 's',
      label: i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.seconds', {
        defaultMessage: 'seconds',
      }),
    },
    {
      'aria-label': i18n.translate(
        'xpack.uptime.alerts.timerangeUnitSelectable.minutesOption.ariaLabel',
        {
          defaultMessage: '"Minutes" time range select item',
        }
      ),
      'data-test-subj': 'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.minutesOption',
      checked: 'on',
      key: 'm',
      label: i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.minutes', {
        defaultMessage: 'minutes',
      }),
    },
    {
      'aria-label': i18n.translate(
        'xpack.uptime.alerts.timerangeUnitSelectable.hoursOption.ariaLabel',
        {
          defaultMessage: '"Hours" time range select item',
        }
      ),
      'data-test-subj': 'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.hoursOption',
      key: 'h',
      label: i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.hours', {
        defaultMessage: 'hours',
      }),
    },
    {
      'aria-label': i18n.translate(
        'xpack.uptime.alerts.timerangeUnitSelectable.daysOption.ariaLabel',
        {
          defaultMessage: '"Days" time range select item',
        }
      ),
      'data-test-subj': 'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable.daysOption',
      key: 'd',
      label: i18n.translate('xpack.uptime.alerts.monitorStatus.timerangeOption.days', {
        defaultMessage: 'days',
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
        selectedLocations.filter(l => l.checked === 'on').map(l => l.label)
      );
    }
  }, [selectedLocations, setAlertParams, allLabels]);

  useEffect(() => {
    setAlertParams('filters', filters);
  }, [filters, setAlertParams]);

  return (
    <>
      <EuiSpacer size="m" />
      <KueryBar
        aria-label={i18n.translate('xpack.uptime.alerts.monitorStatus.filterBar.ariaLabel', {
          defaultMessage: 'Input that allows filtering criteria for the monitor status alert',
        })}
        autocomplete={props.autocomplete}
        data-test-subj="xpack.uptime.alerts.monitorStatus.filterBar"
      />
      <EuiSpacer size="s" />
      <AlertExpressionPopover
        aria-label={i18n.translate(
          'xpack.uptime.alerts.monitorStatus.numTimesExpression.ariaLabel',
          {
            defaultMessage: 'Open the popover for down count input',
          }
        )}
        content={
          <AlertFieldNumber
            aria-label={i18n.translate(
              'xpack.uptime.alerts.monitorStatus.numTimesField.ariaLabel',
              {
                defaultMessage: 'Enter number of down counts required to trigger the alert',
              }
            )}
            data-test-subj="xpack.uptime.alerts.monitorStatus.numTimesField"
            disabled={false}
            fieldValue={numTimes}
            setFieldValue={setNumTimes}
          />
        }
        data-test-subj="xpack.uptime.alerts.monitorStatus.numTimesExpression"
        description={
          filters
            ? i18n.translate(
                'xpack.uptime.alerts.monitorStatus.numTimesExpression.matchingMonitors.description',
                {
                  defaultMessage: 'matching monitors are down >',
                }
              )
            : i18n.translate(
                'xpack.uptime.alerts.monitorStatus.numTimesExpression.anyMonitors.description',
                {
                  defaultMessage: 'any monitor is down >',
                }
              )
        }
        id="ping-count"
        value={`${numTimes} times`}
      />
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <AlertExpressionPopover
            aria-label={i18n.translate(
              'xpack.uptime.alerts.monitorStatus.timerangeValueExpression.ariaLabel',
              {
                defaultMessage: 'Open the popover for time range value field',
              }
            )}
            content={
              <AlertFieldNumber
                aria-label={i18n.translate(
                  'xpack.uptime.alerts.monitorStatus.timerangeValueField.ariaLabel',
                  {
                    defaultMessage: `Enter the number of time units for the alert's range`,
                  }
                )}
                data-test-subj="xpack.uptime.alerts.monitorStatus.timerangeValueField"
                disabled={false}
                fieldValue={numMins}
                setFieldValue={setNumMins}
              />
            }
            data-test-subj="xpack.uptime.alerts.monitorStatus.timerangeValueExpression"
            description="within"
            id="timerange"
            value={`last ${numMins}`}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <AlertExpressionPopover
            aria-label={i18n.translate(
              'xpack.uptime.alerts.monitorStatus.timerangeUnitExpression.ariaLabel',
              {
                defaultMessage: 'Open the popover for time range unit select field',
              }
            )}
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
                  aria-label={i18n.translate(
                    'xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable',
                    {
                      defaultMessage: 'Selectable field for the time range units alerts should use',
                    }
                  )}
                  data-test-subj="xpack.uptime.alerts.monitorStatus.timerangeUnitSelectable"
                  options={timerangeUnitOptions}
                  onChange={newOptions => {
                    if (newOptions.reduce((acc, { checked }) => acc || checked === 'on', false)) {
                      setTimerangeUnitOptions(newOptions);
                    }
                  }}
                  singleSelection={true}
                  listProps={{
                    showIcons: true,
                  }}
                >
                  {list => list}
                </EuiSelectable>
              </>
            }
            data-test-subj="xpack.uptime.alerts.monitorStatus.timerangeUnitExpression"
            description=""
            id="timerange-unit"
            value={
              timerangeUnitOptions.find(({ checked }) => checked === 'on')?.label.toLowerCase() ??
              ''
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      {selectedLocations.length === 0 && (
        <EuiExpression
          color="secondary"
          data-test-subj="xpack.uptime.alerts.monitorStatus.locationsEmpty"
          description="in"
          isActive={false}
          value="all locations"
        />
      )}
      {selectedLocations.length > 0 && (
        <AlertExpressionPopover
          aria-label={i18n.translate(
            'xpack.uptime.alerts.monitorStatus.locationsSelectionExpression.ariaLabel',
            {
              defaultMessage: 'Open the popover to select locations the alert should trigger',
            }
          )}
          content={
            <EuiFlexGroup direction="column">
              <EuiFlexItem>
                <EuiSwitch
                  aria-label={i18n.translate(
                    'xpack.uptime.alerts.monitorStatus.locationSelectionSwitch.ariaLabel',
                    {
                      defaultMessage: 'Select the locations the alert should trigger',
                    }
                  )}
                  data-test-subj="xpack.uptime.alerts.monitorStatus.locationsSelectionSwitch"
                  label="Check all locations"
                  checked={allLabels}
                  onChange={() => {
                    setAllLabels(!allLabels);
                    setSelectedLocations(
                      selectedLocations.map((l: any) => ({
                        'aria-label': i18n.translate(
                          'xpack.uptime.alerts.monitorStatus.locationSelection',
                          {
                            defaultMessage: 'Select the location {location}',
                            values: {
                              location: l,
                            },
                          }
                        ),
                        ...l,
                        'data-test-subj': `xpack.uptime.alerts.monitorStatus.locationSelection.${l.label}LocationOption`,
                        disabled: !allLabels,
                      }))
                    );
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelectable
                  data-test-subj="xpack.uptime.alerts.monitorStatus.locationsSelectionSelectable"
                  options={selectedLocations}
                  onChange={e => setSelectedLocations(e)}
                >
                  {location => location}
                </EuiSelectable>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
          data-test-subj="xpack.uptime.alerts.monitorStatus.locationsSelectionExpression"
          description="from"
          id="locations"
          value={
            selectedLocations.length === 0 || allLabels
              ? 'any location'
              : selectedLocationsToString(selectedLocations)
          }
        />
      )}
    </>
  );
};
