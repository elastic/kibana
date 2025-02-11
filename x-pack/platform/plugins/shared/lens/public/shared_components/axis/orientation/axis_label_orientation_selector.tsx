/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiButtonGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AxesSettingsConfigKeys } from '../types';

export const allowedOrientations = [0, -45, -90] as const;
export type Orientation = (typeof allowedOrientations)[number];

const orientationOptions: Array<{
  id: string;
  value: Orientation;
  label: string;
}> = [
  {
    id: 'axis_orientation_horizontal',
    value: 0,
    label: i18n.translate('xpack.lens.shared.axisOrientation.horizontal', {
      defaultMessage: 'Horizontal',
    }),
  },
  {
    id: 'axis_orientation_vertical',
    value: -90,
    label: i18n.translate('xpack.lens.shared.axisOrientation.vertical', {
      defaultMessage: 'Vertical',
    }),
  },
  {
    id: 'axis_orientation_angled',
    value: -45,
    label: i18n.translate('xpack.lens.shared.axisOrientation.angled', {
      defaultMessage: 'Angled',
    }),
  },
];

export interface AxisLabelOrientationSelectorProps {
  axis: AxesSettingsConfigKeys;
  selectedLabelOrientation: Orientation;
  setLabelOrientation: (orientation: Orientation) => void;
}

export const AxisLabelOrientationSelector: React.FunctionComponent<
  AxisLabelOrientationSelectorProps
> = ({ axis = 'x', selectedLabelOrientation, setLabelOrientation }) => {
  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.shared.axisOrientation.label', {
        defaultMessage: 'Orientation',
      })}
    >
      <EuiButtonGroup
        isFullWidth
        legend={i18n.translate('xpack.lens.shared.axisOrientation.label', {
          defaultMessage: 'Orientation',
        })}
        data-test-subj={`lns${axis}AxisLabelRotationSelector`}
        buttonSize="compressed"
        options={orientationOptions}
        idSelected={
          orientationOptions.find(({ value }) => value === selectedLabelOrientation)?.id ??
          orientationOptions[0].id
        }
        onChange={(optionId: string) => {
          const newOrientation =
            orientationOptions.find(({ id }) => id === optionId)?.value ??
            orientationOptions[0].value;
          setLabelOrientation(newOrientation);
        }}
      />
    </EuiFormRow>
  );
};
