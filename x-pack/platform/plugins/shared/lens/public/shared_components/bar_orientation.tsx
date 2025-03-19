/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';

type BarOrientation = 'vertical' | 'horizontal';

const getBarOrientationOptions = (
  isDisabled?: boolean
): Array<{
  id: string;
  value: BarOrientation;
  label: string;
  'data-test-subj': string;
  toolTipContent?: string;
}> => [
  {
    id: `bar_orientation_horizontal`,
    value: 'horizontal',
    label: i18n.translate('xpack.lens.shared.barOrientation.horizontal', {
      defaultMessage: 'Horizontal',
    }),
    'data-test-subj': 'lns_barOrientation_horizontal',
    toolTipContent: isDisabled
      ? i18n.translate('xpack.lens.shared.barOrientation.disabled', {
          defaultMessage:
            'A horizontal bar orientation cannot be applied when there are one or more area visualization layers.',
        })
      : undefined,
  },
  {
    id: `bar_orientation_vertical`,
    value: 'vertical',
    label: i18n.translate('xpack.lens.shared.barOrientation.vertical', {
      defaultMessage: 'Vertical',
    }),
    'data-test-subj': 'lns_barOrientation_vertical',
  },
];

export interface BarOrientationProps {
  barOrientation?: BarOrientation;
  onBarOrientationChange: (newMode: BarOrientation) => void;
  isDisabled?: boolean;
}

export const BarOrientationSettings: FC<BarOrientationProps> = ({
  barOrientation = 'horizontal',
  onBarOrientationChange,
  isDisabled = false,
}) => {
  const barOrientationOptions = getBarOrientationOptions(isDisabled);
  const label = i18n.translate('xpack.lens.shared.barOrientation', {
    defaultMessage: 'Bar orientation',
  });
  const isSelected =
    barOrientationOptions.find(({ value }) => value === barOrientation)?.id ||
    'bar_orientation_horizontal';

  return (
    <EuiFormRow display="columnCompressed" label={label} fullWidth isDisabled={isDisabled}>
      <EuiButtonGroup
        isDisabled={isDisabled}
        isFullWidth
        legend={label}
        data-test-subj="lns_barOrientation"
        buttonSize="compressed"
        options={barOrientationOptions}
        idSelected={isSelected}
        onChange={(modeId) => {
          const newMode = barOrientationOptions.find(({ id }) => id === modeId);
          if (newMode) {
            onBarOrientationChange(newMode.value);
          }
        }}
      />
    </EuiFormRow>
  );
};
