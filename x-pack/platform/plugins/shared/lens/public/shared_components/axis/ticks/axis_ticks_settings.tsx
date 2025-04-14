/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiSwitch, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AxesSettingsConfigKeys } from '../types';

export interface AxisTicksSettingsProps {
  /**
   * Determines the axis
   */
  axis: AxesSettingsConfigKeys;
  /**
   * Callback to axis ticks status change
   */
  updateTicksVisibilityState: (visible: boolean, axis: AxesSettingsConfigKeys) => void;
  /**
   * Determines if the axis tick labels are visible
   */
  isAxisLabelVisible: boolean;
}

export const AxisTicksSettings: React.FunctionComponent<AxisTicksSettingsProps> = ({
  axis,
  isAxisLabelVisible,
  updateTicksVisibilityState,
}) => {
  const onTicksStatusChange = useCallback(
    (visible: boolean) => updateTicksVisibilityState(visible, axis),
    [axis, updateTicksVisibilityState]
  );

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate('xpack.lens.shared.tickLabels', {
          defaultMessage: 'Tick labels',
        })}
        fullWidth
      >
        <EuiSwitch
          compressed
          data-test-subj={`lnsshow${axis}AxisTickLabels`}
          label={i18n.translate('xpack.lens.shared.tickLabels', {
            defaultMessage: 'Tick labels',
          })}
          onChange={() => onTicksStatusChange(!isAxisLabelVisible)}
          checked={isAxisLabelVisible}
          showLabel={false}
        />
      </EuiFormRow>
    </>
  );
};
