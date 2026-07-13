/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiButtonGroup } from '@elastic/eui';
import type { AreaFillOption } from '@kbn/expression-xy-plugin/common';
import { AreaFillOptions } from '@kbn/expression-xy-plugin/public';

const fillLabel = i18n.translate('xpack.lens.xyChart.fillLabel', {
  defaultMessage: 'Fill',
});

const areaFillOptions: Array<{
  id: string;
  value: AreaFillOption;
  label: string;
}> = [
  {
    id: `xy_area_fill_solid`,
    value: AreaFillOptions.SOLID,
    label: i18n.translate('xpack.lens.xy.areaFill.solid', {
      defaultMessage: 'Solid',
    }),
  },
  {
    id: `xy_area_fill_gradient`,
    value: AreaFillOptions.GRADIENT,
    label: i18n.translate('xpack.lens.xy.areaFill.gradient', {
      defaultMessage: 'Gradient',
    }),
  },
];

export interface AreaFillOptionProps {
  selectedAreaFillOption?: AreaFillOption;
  onChange: (value: AreaFillOption) => void;
}

export const AreaFillOption: React.FC<AreaFillOptionProps> = ({
  selectedAreaFillOption = AreaFillOptions.SOLID,
  onChange,
}) => {
  const selectedOption =
    areaFillOptions.find(({ value }) => value === selectedAreaFillOption) ?? areaFillOptions[0];

  return (
    <EuiFormRow display="columnCompressed" label={fillLabel} fullWidth>
      <EuiButtonGroup
        isFullWidth
        legend={fillLabel}
        data-test-subj="lnsAreaFillOption"
        buttonSize="compressed"
        options={areaFillOptions}
        idSelected={selectedOption.id}
        onChange={(optionId) => {
          const newAreaFillOption = areaFillOptions.find(({ id }) => id === optionId);
          if (newAreaFillOption) {
            onChange(newAreaFillOption.value);
          }
        }}
      />
    </EuiFormRow>
  );
};
