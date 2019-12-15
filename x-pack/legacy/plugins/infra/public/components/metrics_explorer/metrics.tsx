/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import React, { useCallback, useState } from 'react';
import { FieldType } from 'ui/index_patterns';
import { colorTransformer, MetricsExplorerColor } from '../../../common/color_palette';
import {
  MetricsExplorerMetric,
  MetricsExplorerAggregation,
} from '../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptions } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { isDisplayable } from '../../utils/is_displayable';

interface Props {
  autoFocus?: boolean;
  options: MetricsExplorerOptions;
  onChange: (metrics: MetricsExplorerMetric[]) => void;
  fields: FieldType[];
}

interface SelectedOption {
  value: string;
  label: string;
}

export const MetricsExplorerMetrics = ({ options, onChange, fields, autoFocus = false }: Props) => {
  const colors = Object.keys(MetricsExplorerColor) as MetricsExplorerColor[];
  const [shouldFocus, setShouldFocus] = useState(autoFocus);

  // the EuiCombobox forwards the ref to an input element
  const autoFocusInputElement = useCallback(
    (inputElement: HTMLInputElement | null) => {
      if (inputElement && shouldFocus) {
        inputElement.focus();
        setShouldFocus(false);
      }
    },
    [shouldFocus]
  );

  const handleChange = useCallback(
    selectedOptions => {
      onChange(
        selectedOptions.map((opt: SelectedOption, index: number) => ({
          aggregation: options.aggregation,
          field: opt.value,
          color: colors[index],
        }))
      );
    },
    [onChange, options.aggregation, colors]
  );

  const comboOptions = fields
    .filter(field => isDisplayable(field))
    .map(field => ({ label: field.name, value: field.name }));
  const selectedOptions = options.metrics
    .filter(m => m.aggregation !== MetricsExplorerAggregation.count)
    .map(metric => ({
      label: metric.field || '',
      value: metric.field || '',
      color: colorTransformer(metric.color || MetricsExplorerColor.color0),
    }));

  const placeholderText = i18n.translate('xpack.infra.metricsExplorer.metricComboBoxPlaceholder', {
    defaultMessage: 'choose a metric to plot',
  });

  return (
    <EuiComboBox
      isDisabled={options.aggregation === MetricsExplorerAggregation.count}
      placeholder={placeholderText}
      fullWidth
      options={comboOptions}
      selectedOptions={selectedOptions}
      onChange={handleChange}
      isClearable={true}
      inputRef={autoFocusInputElement}
    />
  );
};
