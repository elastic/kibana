/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiRange } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { AreaFillOptions, type AreaFillOption } from '@kbn/expression-xy-plugin/common';

export interface FillOpacityOptionProps {
  /**
   * Currently selected value
   */
  value: number;
  /**
   * Callback on display option change
   */
  onChange: (value: number) => void;
  /**
   * Flag for rendering or not the component
   */
  isFillOpacityEnabled?: boolean;
  /**
   * Currently selected fill option
   */
  fill?: AreaFillOption;
}

export const FillOpacityOption: React.FC<FillOpacityOptionProps> = ({
  onChange,
  value,
  isFillOpacityEnabled = true,
  fill,
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue({ value, onChange });
  const min = fill === AreaFillOptions.GRADIENT ? 0.3 : 0.1;

  return isFillOpacityEnabled ? (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.xyChart.areaFillOpacityLabel', {
          defaultMessage: 'Area fill opacity',
        })}
        fullWidth
      >
        <EuiRange
          data-test-subj="lnsFillOpacity"
          value={inputValue}
          min={min}
          max={1}
          step={0.1}
          showInput
          compressed
          fullWidth
          onChange={(e) => {
            handleInputChange(Number(e.currentTarget.value));
          }}
        />
      </EuiFormRow>
    </>
  ) : null;
};
