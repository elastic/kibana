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

export const DensitySettings: React.FC<DensitySettingsProps> = ({ dataGridDensity, onChange }) => {
  const isValidDensity = (value: string): value is DataGridDensity => {
    return densityValues.includes(value as DataGridDensity);
  };

  // Falls back to NORMAL density when an invalid density is provided
  const validDensity = isValidDensity(dataGridDensity) ? dataGridDensity : DataGridDensity.NORMAL;

  const setDensity = useCallback(
    (density: string) => {
      const _density = isValidDensity(density) ? density : DataGridDensity.NORMAL;
      onChange(_density);
    },
    [onChange]
  );

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

  return (
    <EuiFormRow label={densityLabel} display="columnCompressed" data-test-subj="lnsDensitySettings">
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
