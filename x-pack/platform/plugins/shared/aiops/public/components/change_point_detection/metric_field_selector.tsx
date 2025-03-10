/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, type EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import { useChangePointDetectionControlsContext } from './change_point_detection_context';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

interface MetricFieldSelectorProps {
  value: string;
  onChange: (value: string) => void;
  inline?: boolean;
}

export const MetricFieldSelector: FC<MetricFieldSelectorProps> = React.memo(
  ({ value, onChange, inline = true }) => {
    const { fieldStats } = useAiopsAppContext();
    const { metricFieldOptions } = useChangePointDetectionControlsContext();

    const { renderOption, closeFlyout } = fieldStats?.useFieldStatsTrigger() ?? {};

    const options = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
      return metricFieldOptions.map((v) => {
        return {
          value: v.name,
          label: v.displayName,
          field: { id: v.name, type: v.type },
        };
      });
    }, [metricFieldOptions]);

    const selection = options.filter((v) => v.value === value);

    const onChangeCallback = useCallback(
      (selectedOptions: EuiComboBoxOptionOption[]) => {
        const option = selectedOptions[0];
        if (typeof option !== 'undefined') {
          onChange(option.value as string);
        }
        if (closeFlyout) {
          closeFlyout();
        }
      },
      [onChange, closeFlyout]
    );

    const label = i18n.translate('xpack.aiops.changePointDetection.selectMetricFieldLabel', {
      defaultMessage: 'Metric field',
    });

    return (
      <>
        <EuiFormRow fullWidth label={inline ? undefined : label}>
          <EuiComboBox
            fullWidth
            compressed
            prepend={inline ? label : undefined}
            singleSelection={{ asPlainText: true }}
            options={options}
            selectedOptions={selection}
            onChange={onChangeCallback}
            isClearable={false}
            data-test-subj="aiopsChangePointMetricField"
            renderOption={renderOption}
          />
        </EuiFormRow>
      </>
    );
  }
);
