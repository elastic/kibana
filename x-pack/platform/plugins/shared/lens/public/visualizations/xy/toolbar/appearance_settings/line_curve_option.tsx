/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import type { XYCurveType } from '@kbn/expression-xy-plugin/common';
import { XYCurveTypes } from '@kbn/expression-xy-plugin/public';
import { lineCurveDefinitions } from './line_curve_definitions';

export interface LineCurveOptionProps {
  value?: XYCurveType;
  onChange: (type: XYCurveType) => void;
  enabled?: boolean;
}

export const LineCurveOption: React.FC<LineCurveOptionProps> = ({
  onChange,
  value = XYCurveTypes.LINEAR,
  enabled = true,
}) => {
  return enabled ? (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.xyChart.lineInterpolationLabel', {
        defaultMessage: 'Line interpolation',
      })}
      fullWidth
    >
      <EuiSuperSelect
        data-test-subj="lnsCurveStyleSelect"
        compressed
        options={lineCurveDefinitions.map(({ type, title, description }) => ({
          value: type,
          dropdownDisplay: (
            <>
              <strong>{title}</strong>
              <EuiText size="xs" color="subdued">
                <p>{description}</p>
              </EuiText>
            </>
          ),
          inputDisplay: title,
        }))}
        valueOfSelected={value}
        onChange={onChange}
        itemLayoutAlign="top"
        hasDividers
      />
    </EuiFormRow>
  ) : null;
};
