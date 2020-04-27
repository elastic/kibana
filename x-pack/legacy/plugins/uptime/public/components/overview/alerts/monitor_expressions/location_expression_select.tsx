/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiExpression, EuiFlexGroup, EuiFlexItem, EuiSelectable, EuiSwitch } from '@elastic/eui';
import { AlertExpressionPopover } from '../alert_expression_popover';

interface Props {
  setAlertParams: (key: string, value: any) => void;
  locations: string[];
}

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

export const LocationExpressionSelect: React.FC<Props> = ({ setAlertParams, locations }) => {
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

  return selectedLocations.length === 0 ? (
    <EuiExpression
      color="secondary"
      data-test-subj="xpack.uptime.alerts.monitorStatus.locationsEmpty"
      description="in"
      isActive={false}
      value="all locations"
    />
  ) : (
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
  );
};
