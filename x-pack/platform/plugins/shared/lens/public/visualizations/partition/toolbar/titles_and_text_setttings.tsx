/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiFieldNumber, EuiButtonGroup } from '@elastic/eui';
import { useDebouncedValue } from '@kbn/visualization-utils';
import type {
  LensPartitionVisualizationState as PieVisualizationState,
  VisualizationToolbarProps,
} from '@kbn/lens-common';
import { DEFAULT_PERCENT_DECIMALS } from '../constants';
import { PartitionChartsMeta } from '../partition_charts_meta';
import { NumberDisplay } from '../../../../common/constants';

export function PartitionTitlesAndTextSettings(
  props: VisualizationToolbarProps<PieVisualizationState>
) {
  const { state, setState } = props;
  const layer = state.layers[0];
  const { categoryOptions, numberOptions } = PartitionChartsMeta[state.shape].toolbar;

  const onStateChange = useCallback(
    (part: Record<string, unknown>) => {
      setState({
        ...state,
        layers: [{ ...layer, ...part }],
      });
    },
    [layer, state, setState]
  );

  const onCategoryDisplayChange = useCallback(
    (option: unknown) => onStateChange({ categoryDisplay: option }),
    [onStateChange]
  );

  const onNumberDisplayChange = useCallback(
    (option: unknown) => onStateChange({ numberDisplay: option }),
    [onStateChange]
  );

  const onPercentDecimalsChange = useCallback(
    (option: unknown) => {
      onStateChange({ percentDecimals: option });
    },
    [onStateChange]
  );

  return (
    <>
      {categoryOptions.length ? (
        <EuiFormRow
          label={i18n.translate('xpack.lens.pieChart.labelSliceLabels', {
            defaultMessage: 'Slice labels',
          })}
          fullWidth
          display="columnCompressed"
        >
          <EuiButtonGroup
            legend={i18n.translate('xpack.lens.pieChart.labelSliceLabels', {
              defaultMessage: 'Slice labels',
            })}
            options={categoryOptions}
            idSelected={layer.categoryDisplay}
            onChange={onCategoryDisplayChange}
            buttonSize="compressed"
            isFullWidth
          />
        </EuiFormRow>
      ) : null}

      {numberOptions.length && layer.categoryDisplay !== 'hide' ? (
        <>
          <EuiFormRow
            label={i18n.translate('xpack.lens.pieChart.sliceValues', {
              defaultMessage: 'Slice values',
            })}
            fullWidth
            display="columnCompressed"
          >
            <EuiButtonGroup
              legend={i18n.translate('xpack.lens.pieChart.sliceValues', {
                defaultMessage: 'Slice values',
              })}
              options={numberOptions}
              idSelected={layer.numberDisplay}
              onChange={onNumberDisplayChange}
              buttonSize="compressed"
              isFullWidth
            />
          </EuiFormRow>
          {layer.numberDisplay === NumberDisplay.PERCENT && (
            <EuiFormRow label=" " fullWidth display="columnCompressed">
              <DecimalPlaceInput
                value={layer.percentDecimals ?? DEFAULT_PERCENT_DECIMALS}
                setValue={onPercentDecimalsChange}
              />
            </EuiFormRow>
          )}
        </>
      ) : null}
    </>
  );
}

const DecimalPlaceInput = ({
  value,
  setValue,
}: {
  value: number;
  setValue: (value: number) => void;
}) => {
  const { inputValue, handleInputChange } = useDebouncedValue(
    {
      value,
      onChange: setValue,
    },
    { allowFalsyValue: true }
  );
  return (
    <EuiFieldNumber
      data-test-subj="indexPattern-dimension-formatDecimals"
      value={inputValue}
      min={0}
      max={10}
      prepend={i18n.translate('xpack.lens.pieChart.decimalPlaces', {
        defaultMessage: 'Decimal places',
      })}
      compressed
      onChange={(e) => {
        handleInputChange(Number(e.currentTarget.value));
      }}
    />
  );
};
