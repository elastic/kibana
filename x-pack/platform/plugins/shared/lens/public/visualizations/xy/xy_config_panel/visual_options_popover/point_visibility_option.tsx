/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiButtonGroup } from '@elastic/eui';
import { PointVisibility } from '@kbn/expression-xy-plugin/common';
import { PointVisibilityOptions } from '@kbn/expression-xy-plugin/public';

const pointVisibilityOptions: Array<{
  id: string;
  value: PointVisibility;
  label: string;
}> = [
  {
    id: `xy_point_visibility_auto`,
    value: PointVisibilityOptions.AUTO,
    label: i18n.translate('xpack.lens.xy.pointVisibility.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    id: `xy_point_visibility_show`,
    value: PointVisibilityOptions.ALWAYS,
    label: i18n.translate('xpack.lens.xy.pointVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: `xy_point_visibility_hide`,
    value: PointVisibilityOptions.NEVER,
    label: i18n.translate('xpack.lens.xy.pointVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];

export interface PointVisibilityOptionProps {
  enabled: boolean;
  selectedPointVisibility?: PointVisibility;
  onChange: (value: PointVisibility) => void;
}

export const PointVisibilityOption: React.FC<PointVisibilityOptionProps> = ({
  enabled = true,
  selectedPointVisibility = PointVisibilityOptions.AUTO,
  onChange,
}) => {
  return enabled ? (
    <EuiFormRow
      display="columnCompressed"
      label={i18n.translate('xpack.lens.xyChart.pointVisibilityLabel', {
        defaultMessage: 'Point visibility',
      })}
      fullWidth
    >
      <EuiButtonGroup
        isFullWidth
        legend={i18n.translate('xpack.lens.xyChart.pointVisibilityLabel', {
          defaultMessage: 'Point visibility',
        })}
        data-test-subj="lnsPointVisibilityOption"
        buttonSize="compressed"
        options={pointVisibilityOptions}
        idSelected={
          pointVisibilityOptions.find(({ value }) => value === selectedPointVisibility)!.id
        }
        onChange={(pointVisibilityId) => {
          const newPointVisibility = pointVisibilityOptions.find(
            ({ id }) => id === pointVisibilityId
          );
          if (newPointVisibility) {
            onChange(newPointVisibility.value);
          }
        }}
      />
    </EuiFormRow>
  ) : null;
};
