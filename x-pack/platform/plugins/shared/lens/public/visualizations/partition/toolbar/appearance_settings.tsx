/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiFormRow, EuiComboBox, EuiIcon } from '@elastic/eui';
import type {
  LensPartitionVisualizationState as PieVisualizationState,
  VisualizationToolbarProps,
} from '@kbn/lens-common';
import { PARTITION_EMPTY_SIZE_RADIUS as EmptySizeRatios } from '@kbn/lens-common';
import { PartitionChartsMeta } from '../partition_charts_meta';

const emptySizeRatioLabel = i18n.translate('xpack.lens.pieChart.donutHole', {
  defaultMessage: 'Donut hole',
});

export function PartitionAppearanceSettings(
  props: VisualizationToolbarProps<PieVisualizationState>
) {
  const { state, setState } = props;
  const layer = state.layers[0];
  const { emptySizeRatioOptions } = PartitionChartsMeta[state.shape].toolbarPopover;

  const onEmptySizeRatioChange = useCallback(
    ([option]: Array<EuiComboBoxOptionOption<string>>) => {
      if (option.value === 'none') {
        setState({ ...state, shape: 'pie', layers: [{ ...layer, emptySizeRatio: undefined }] });
      } else {
        const emptySizeRatio = emptySizeRatioOptions?.find(({ id }) => id === option.value)?.value;
        setState({
          ...state,
          shape: 'donut',
          layers: [{ ...layer, emptySizeRatio }],
        });
      }
    },
    [emptySizeRatioOptions, layer, setState, state]
  );

  const options =
    emptySizeRatioOptions &&
    emptySizeRatioOptions.map(({ id, label, icon }) => ({
      value: id,
      label,
      prepend: icon ? <EuiIcon type={icon} /> : undefined,
    }));

  const selectedOption = emptySizeRatioOptions
    ? emptySizeRatioOptions.find(
        ({ value }) =>
          value === (state.shape === 'pie' ? 0 : layer.emptySizeRatio ?? EmptySizeRatios.SMALL)
      )
    : undefined;

  const selectedOptions = selectedOption
    ? [{ value: selectedOption.id, label: selectedOption.label }]
    : undefined;

  return (
    <EuiFormRow label={emptySizeRatioLabel} display="columnCompressed" fullWidth>
      <EuiComboBox
        fullWidth
        compressed
        data-test-subj="lnsEmptySizeRatioOption"
        aria-label={i18n.translate('xpack.lens.pieChart.donutHole', {
          defaultMessage: 'Donut hole',
        })}
        onChange={onEmptySizeRatioChange}
        isClearable={false}
        options={options}
        selectedOptions={selectedOptions}
        singleSelection={{ asPlainText: true }}
        prepend={selectedOption?.icon ? <EuiIcon type={selectedOption.icon} /> : undefined}
      />
    </EuiFormRow>
  );
}
