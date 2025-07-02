/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { DataGridDensity } from '@kbn/unified-data-table';

export interface DensitySettingsProps {
  dataGridDensity: DataGridDensity;
  onChange: (density: DataGridDensity) => void;
}

const densityValues = Object.values(DataGridDensity);

const getValidDensity = (density: string) => {
  const isValidDensity = densityValues.includes(density as DataGridDensity);
  return isValidDensity ? (density as DataGridDensity) : DataGridDensity.NORMAL;
};

const densityLabel = i18n.translate('xpack.lens.table.densityLabel', {
  defaultMessage: 'Density',
});

const densityOptions = [
  {
    id: DataGridDensity.COMPACT,
    label: i18n.translate('xpack.lens.table.labelCompact', {
      defaultMessage: 'Compact',
    }),
  },
  {
    id: DataGridDensity.NORMAL,
    label: i18n.translate('xpack.lens.table.labelNormal', {
      defaultMessage: 'Normal',
    }),
  },
  {
    id: DataGridDensity.EXPANDED,
    label: i18n.translate('xpack.lens.table.labelExpanded', {
      defaultMessage: 'Expanded',
    }),
  },
];

export const DensitySettings: React.FC<DensitySettingsProps> = ({ dataGridDensity, onChange }) => {
  // Falls back to NORMAL density when an invalid density is provided
  const validDensity = getValidDensity(dataGridDensity);

  const setDensity = useCallback(
    (density: string) => {
      onChange(getValidDensity(density));
    },
    [onChange]
  );

  return (
    <EuiFormRow
      label={densityLabel}
      aria-label={densityLabel}
      display="columnCompressed"
      data-test-subj="lnsDensitySettings"
    >
      <EuiButtonGroup
        legend={densityLabel}
        buttonSize="compressed"
        isFullWidth
        options={densityOptions}
        onChange={setDensity}
        idSelected={validDensity}
      />
    </EuiFormRow>
  );
};
