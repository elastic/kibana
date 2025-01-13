/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './toolbar.scss';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFormRow,
  EuiComboBox,
  EuiIcon,
  EuiFieldNumber,
  EuiButtonGroup,
  EuiFlexItem,
  EuiComboBoxOptionOption,
} from '@elastic/eui';
import { LegendValue, Position } from '@elastic/charts';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { type PartitionLegendValue } from '@kbn/visualizations-plugin/common/constants';
import { DEFAULT_PERCENT_DECIMALS } from './constants';
import { PartitionChartsMeta } from './partition_charts_meta';
import { EmptySizeRatios, PieVisualizationState, SharedPieLayerState } from '../../../common/types';
import { LegendDisplay, NumberDisplay } from '../../../common/constants';
import { VisualizationToolbarProps } from '../../types';
import { ToolbarPopover, LegendSettingsPopover } from '../../shared_components';
import { getDefaultVisualValuesForLayer } from '../../shared_components/datasource_default_values';
import { getLegendStats } from './render_helpers';

const partitionLegendValues = [
  {
    value: LegendValue.Value,
    label: i18n.translate('xpack.lens.shared.legendValues.value', {
      defaultMessage: 'Value',
    }),
  },
];

const legendOptions: Array<{
  value: SharedPieLayerState['legendDisplay'];
  label: string;
  id: string;
}> = [
  {
    id: 'pieLegendDisplay-default',
    value: LegendDisplay.DEFAULT,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.auto', {
      defaultMessage: 'Auto',
    }),
  },
  {
    id: 'pieLegendDisplay-show',
    value: LegendDisplay.SHOW,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.show', {
      defaultMessage: 'Show',
    }),
  },
  {
    id: 'pieLegendDisplay-hide',
    value: LegendDisplay.HIDE,
    label: i18n.translate('xpack.lens.pieChart.legendVisibility.hide', {
      defaultMessage: 'Hide',
    }),
  },
];

const PANEL_STYLE = {
  width: '500px',
};

const emptySizeRatioLabel = i18n.translate('xpack.lens.pieChart.donutHole', {
  defaultMessage: 'Donut hole',
});

export function PieToolbar(props: VisualizationToolbarProps<PieVisualizationState>) {
  const { state, setState, frame } = props;
  const layer = state.layers[0];
  const {
    categoryOptions,
    numberOptions,
    emptySizeRatioOptions,
    isDisabled: isToolbarPopoverDisabled,
  } = PartitionChartsMeta[state.shape].toolbarPopover;

  const legendSize = layer.legendSize;

  const [hadAutoLegendSize] = useState(() => legendSize === LegendSize.AUTO);

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

  const onLegendDisplayChange = useCallback(
    (optionId: unknown) => {
      onStateChange({ legendDisplay: legendOptions.find(({ id }) => id === optionId)!.value });
    },
    [onStateChange]
  );

  const onLegendPositionChange = useCallback(
    (id: unknown) => onStateChange({ legendPosition: id as Position }),
    [onStateChange]
  );

  const onNestedLegendChange = useCallback(
    (id: unknown) => onStateChange({ nestedLegend: !layer.nestedLegend }),
    [layer, onStateChange]
  );

  const onTruncateLegendChange = useCallback(() => {
    const current = layer.truncateLegend ?? true;
    onStateChange({ truncateLegend: !current });
  }, [layer, onStateChange]);

  const onLegendMaxLinesChange = useCallback(
    (val: unknown) => onStateChange({ legendMaxLines: val }),
    [onStateChange]
  );

  const onLegendSizeChange = useCallback(
    (val: unknown) => onStateChange({ legendSize: val }),
    [onStateChange]
  );

  const onLegendStatsChange = useCallback(
    (legendStats: unknown) => {
      onStateChange({ legendStats });
    },
    [onStateChange]
  );

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
  const selectedOption = emptySizeRatioOptions
    ? emptySizeRatioOptions.find(
        ({ value }) =>
          value === (state.shape === 'pie' ? 0 : layer.emptySizeRatio ?? EmptySizeRatios.SMALL)
      )
    : undefined;

  if (!layer) {
    return null;
  }

  const defaultTruncationValue = getDefaultVisualValuesForLayer(
    state,
    frame.datasourceLayers
  ).truncateText;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {emptySizeRatioOptions?.length && selectedOption ? (
        <EuiFlexItem grow={false}>
          <ToolbarPopover
            title={i18n.translate('xpack.lens.pieChart.appearanceLabel', {
              defaultMessage: 'Appearance',
            })}
            type="visualOptions"
            buttonDataTestSubj="lnsVisualOptionsButton"
            data-test-subj="lnsVisualOptionsPopover"
          >
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
                options={emptySizeRatioOptions.map(({ id, label, icon }) => ({
                  value: id,
                  label,
                  prepend: icon ? <EuiIcon type={icon} /> : undefined,
                }))}
                selectedOptions={[{ value: selectedOption.id, label: selectedOption.label }]}
                singleSelection={{ asPlainText: true }}
                prepend={selectedOption?.icon ? <EuiIcon type={selectedOption.icon} /> : undefined}
              />
            </EuiFormRow>
          </ToolbarPopover>
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <ToolbarPopover
          title={i18n.translate('xpack.lens.pieChart.titlesAndTextLabel', {
            defaultMessage: 'Titles and text',
          })}
          isDisabled={Boolean(isToolbarPopoverDisabled)}
          type="titlesAndText"
          panelStyle={PANEL_STYLE}
        >
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
        </ToolbarPopover>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <LegendSettingsPopover<PartitionLegendValue>
          groupPosition={'none'}
          legendOptions={legendOptions}
          mode={layer.legendDisplay}
          onDisplayChange={onLegendDisplayChange}
          legendStats={getLegendStats(layer, state.shape)}
          allowedLegendStats={
            PartitionChartsMeta[state.shape]?.legend.defaultLegendStats
              ? partitionLegendValues
              : undefined
          }
          onLegendStatsChange={onLegendStatsChange}
          position={layer.legendPosition}
          onPositionChange={onLegendPositionChange}
          renderNestedLegendSwitch={
            !PartitionChartsMeta[state.shape]?.legend.hideNestedLegendSwitch &&
            layer.primaryGroups.length + (layer.secondaryGroups?.length ?? 0) > 1
          }
          nestedLegend={Boolean(layer.nestedLegend)}
          onNestedLegendChange={onNestedLegendChange}
          shouldTruncate={layer.truncateLegend ?? defaultTruncationValue}
          onTruncateLegendChange={onTruncateLegendChange}
          maxLines={layer?.legendMaxLines}
          onMaxLinesChange={onLegendMaxLinesChange}
          legendSize={legendSize}
          onLegendSizeChange={onLegendSizeChange}
          showAutoLegendSizeOption={hadAutoLegendSize}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
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
