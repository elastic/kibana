/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFieldNumber,
  EuiFormRow,
  EuiPopoverFooter,
} from '@elastic/eui';
import { panelStrings } from '../../../../../connected_components/panel_strings';

export const KM_ABBREVIATION = i18n.translate(
  'xpack.maps.spatialJoin.wizardForm.kilometersAbbreviation',
  {
    defaultMessage: 'km',
  }
);

interface Props {
  initialDistance: number;
  onClose: () => void;
  onDistanceChange: (distance: number) => void;
}

function getDistanceAsNumber(distance: string | number): number {
  return typeof distance === 'string' ? parseFloat(distance as string) : distance;
}

export function DistanceForm(props: Props) {
  const [distance, setDistance] = useState<number | string>(props.initialDistance);
  const distanceAsNumber = getDistanceAsNumber(distance);
  const isDistanceInvalid = isNaN(distanceAsNumber) || distanceAsNumber <= 0;

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.maps.spatialJoin.wizardForm.distanceLabel', {
          defaultMessage: 'Distance',
        })}
        isInvalid={isDistanceInvalid}
        error={
          isDistanceInvalid
            ? [
                i18n.translate('xpack.maps.spatialJoin.wizardForm.invalidDistanceMessage', {
                  defaultMessage: 'Value must be a number greater than 0',
                }),
              ]
            : []
        }
      >
        <EuiFieldNumber
          append={KM_ABBREVIATION}
          aria-label={i18n.translate('xpack.maps.spatialJoin.wizardForm.distanceInputAriaLabel', {
            defaultMessage: 'distance input',
          })}
          isInvalid={isDistanceInvalid}
          min={0}
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            setDistance(e.target.value);
          }}
          value={distance}
        />
      </EuiFormRow>
      <EuiPopoverFooter paddingSize="s">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiButtonEmpty onClick={props.onClose} size="s">
              {panelStrings.close}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton
              fill
              isDisabled={
                isDistanceInvalid || props.initialDistance.toString() === distance.toString()
              }
              onClick={() => {
                props.onDistanceChange(getDistanceAsNumber(distance));
                props.onClose();
              }}
              size="s"
            >
              {panelStrings.apply}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPopoverFooter>
    </>
  );
}
