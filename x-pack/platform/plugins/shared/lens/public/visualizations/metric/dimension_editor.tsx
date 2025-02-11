/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFormRow,
  EuiButtonGroup,
  EuiFieldNumber,
  htmlIdGenerator,
  EuiColorPicker,
  euiPaletteColorBlind,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { LayoutDirection } from '@elastic/charts';
import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  PaletteRegistry,
  CustomizablePalette,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
  applyPaletteParams,
} from '@kbn/coloring';
import { getDataBoundsForPalette } from '@kbn/expression-metric-vis-plugin/public';
import { getColumnByAccessor } from '@kbn/visualizations-plugin/common/utils';
import { css } from '@emotion/react';
import { DebouncedInput, IconSelect } from '@kbn/visualization-ui-components';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { PalettePanelContainer } from '../../shared_components';
import type { VisualizationDimensionEditorProps } from '../../types';
import { defaultNumberPaletteParams, defaultPercentagePaletteParams } from './palette_config';
import { DEFAULT_MAX_COLUMNS, getDefaultColor, showingBar } from './visualization';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { MetricVisualizationState } from './types';
import { metricIconsSet } from '../../shared_components/icon_set';
import { isMetricNumericType } from './helpers';

export type SupportingVisType = 'none' | 'bar' | 'trendline';

type Props = VisualizationDimensionEditorProps<MetricVisualizationState> & {
  paletteService: PaletteRegistry;
};

type SubProps = Props & { idPrefix: string };

export function DimensionEditor(props: Props) {
  const { state, accessor } = props;

  const idPrefix = htmlIdGenerator()();

  switch (accessor) {
    case state?.metricAccessor:
      return (
        <div data-test-subj="lnsMetricDimensionEditor_primary_metric">
          <PrimaryMetricEditor {...props} idPrefix={idPrefix} />
        </div>
      );
    case state.secondaryMetricAccessor:
      return (
        <div data-test-subj="lnsMetricDimensionEditor_secondary_metric">
          <SecondaryMetricEditor {...props} idPrefix={idPrefix} />
        </div>
      );
    case state.maxAccessor:
      return (
        <div data-test-subj="lnsMetricDimensionEditor_maximum">
          <MaximumEditor {...props} idPrefix={idPrefix} />
        </div>
      );
    case state.breakdownByAccessor:
      return (
        <div data-test-subj="lnsMetricDimensionEditor_breakdown">
          <BreakdownByEditor {...props} idPrefix={idPrefix} />
        </div>
      );
    default:
      return null;
  }
}

function BreakdownByEditor({ setState, state }: SubProps) {
  const setMaxCols = useCallback(
    (columns: string) => {
      setState({ ...state, maxCols: parseInt(columns, 10) });
    },
    [setState, state]
  );

  const { inputValue: currentMaxCols, handleInputChange: handleMaxColsChange } =
    useDebouncedValue<string>({
      onChange: setMaxCols,
      value: String(state.maxCols ?? DEFAULT_MAX_COLUMNS),
    });

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.lens.metric.maxColumns', {
          defaultMessage: 'Layout columns',
        })}
        fullWidth
        display="columnCompressed"
      >
        <EuiFieldNumber
          compressed={true}
          min={1}
          data-test-subj="lnsMetric_max_cols"
          value={currentMaxCols}
          onChange={({ target: { value } }) => handleMaxColsChange(value)}
        />
      </EuiFormRow>
      <CollapseSetting
        value={state.collapseFn || ''}
        onChange={(collapseFn) => {
          setState({
            ...state,
            collapseFn,
          });
        }}
      />
    </>
  );
}

function MaximumEditor({ setState, state, idPrefix }: SubProps) {
  return null;
}

function SecondaryMetricEditor({ accessor, idPrefix, frame, layerId, setState, state }: SubProps) {
  const columnName = getColumnByAccessor(accessor, frame.activeData?.[layerId]?.columns)?.name;
  const defaultPrefix = columnName || '';

  return (
    <EuiFormRow
      display="columnCompressed"
      fullWidth
      label={i18n.translate('xpack.lens.metric.prefixText.label', {
        defaultMessage: 'Prefix',
      })}
    >
      <>
        <EuiButtonGroup
          isFullWidth
          buttonSize="compressed"
          legend={i18n.translate('xpack.lens.metric.prefix.label', {
            defaultMessage: 'Prefix',
          })}
          data-test-subj="lnsMetric_prefix_buttons"
          options={[
            {
              id: `${idPrefix}auto`,
              label: i18n.translate('xpack.lens.metric.prefix.auto', {
                defaultMessage: 'Auto',
              }),
              'data-test-subj': 'lnsMetric_prefix_auto',
              value: undefined,
            },
            {
              id: `${idPrefix}custom`,
              label: i18n.translate('xpack.lens.metric.prefix.custom', {
                defaultMessage: 'Custom',
              }),
              'data-test-subj': 'lnsMetric_prefix_custom',
              value: defaultPrefix,
            },
            {
              id: `${idPrefix}none`,
              label: i18n.translate('xpack.lens.metric.prefix.none', {
                defaultMessage: 'None',
              }),
              'data-test-subj': 'lnsMetric_prefix_none',
              value: '',
            },
          ]}
          idSelected={`${idPrefix}${
            state.secondaryPrefix === undefined
              ? 'auto'
              : state.secondaryPrefix === ''
              ? 'none'
              : 'custom'
          }`}
          onChange={(_id, secondaryPrefix) => {
            setState({
              ...state,
              secondaryPrefix,
            });
          }}
        />
        <EuiSpacer size="s" />
        {state.secondaryPrefix && (
          <DebouncedInput
            data-test-subj="lnsMetric_prefix_custom_input"
            compressed
            value={state.secondaryPrefix}
            onChange={(newPrefix) => {
              setState({
                ...state,
                secondaryPrefix: newPrefix,
              });
            }}
          />
        )}
      </>
    </EuiFormRow>
  );
}

function PrimaryMetricEditor(props: SubProps) {
  const { state, setState, frame, accessor, idPrefix, isInlineEditing } = props;

  if (accessor == null) {
    return null;
  }

  const isMetricNumeric = isMetricNumericType(props.datasource, accessor);

  const hasDynamicColoring = Boolean(isMetricNumeric && state.palette);

  const supportsPercentPalette = Boolean(
    state.maxAccessor ||
      (state.breakdownByAccessor && !state.collapseFn) ||
      state.palette?.params?.rangeType === 'percent'
  );

  const activePalette = state.palette || {
    type: 'palette',
    name: (supportsPercentPalette ? defaultPercentagePaletteParams : defaultNumberPaletteParams)
      .name,
    params: {
      ...(supportsPercentPalette ? defaultPercentagePaletteParams : defaultNumberPaletteParams),
    },
  };

  const currentMinMax = getDataBoundsForPalette(
    {
      metric: state.metricAccessor!,
      max: state.maxAccessor,
      // if we're collapsing, pretend like there's no breakdown to match the activeData
      breakdownBy: !state.collapseFn ? state.breakdownByAccessor : undefined,
    },
    frame.activeData?.[state.layerId]
  );

  const displayStops = applyPaletteParams(props.paletteService, activePalette, {
    min: currentMinMax.min ?? DEFAULT_MIN_STOP,
    max: currentMinMax.max ?? DEFAULT_MAX_STOP,
  });

  return (
    <>
      {isMetricNumeric && (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.metric.colorByValue.label', {
            defaultMessage: 'Color by value',
          })}
        >
          <EuiButtonGroup
            isFullWidth
            buttonSize="compressed"
            legend={i18n.translate('xpack.lens.metric.colorByValue.label', {
              defaultMessage: 'Color by value',
            })}
            data-test-subj="lnsMetric_color_mode_buttons"
            options={[
              {
                id: `${idPrefix}static`,
                label: i18n.translate('xpack.lens.metric.colorMode.static', {
                  defaultMessage: 'Static',
                }),
                'data-test-subj': 'lnsMetric_color_mode_static',
              },
              {
                id: `${idPrefix}dynamic`,
                label: i18n.translate('xpack.lens.metric.colorMode.dynamic', {
                  defaultMessage: 'Dynamic',
                }),
                'data-test-subj': 'lnsMetric_color_mode_dynamic',
              },
            ]}
            idSelected={`${idPrefix}${state.palette ? 'dynamic' : 'static'}`}
            onChange={(id) => {
              const colorMode = id.replace(idPrefix, '') as 'static' | 'dynamic';

              const params =
                colorMode === 'dynamic'
                  ? {
                      palette: {
                        ...activePalette,
                        params: {
                          ...activePalette.params,
                          stops: displayStops,
                        },
                      },
                      color: undefined,
                    }
                  : {
                      palette: undefined,
                      color: undefined,
                    };
              setState({
                ...state,
                ...params,
              });
            }}
          />
        </EuiFormRow>
      )}
      {!hasDynamicColoring && (
        <StaticColorControls state={state} setState={setState} isMetricNumeric={isMetricNumeric} />
      )}
      {hasDynamicColoring && (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.paletteMetricGradient.label', {
            defaultMessage: 'Color mapping',
          })}
        >
          <PalettePanelContainer
            palette={displayStops.map(({ color }) => color)}
            siblingRef={props.panelRef}
            isInlineEditing={isInlineEditing}
          >
            <CustomizablePalette
              palettes={props.paletteService}
              activePalette={activePalette}
              dataBounds={currentMinMax}
              showRangeTypeSelector={supportsPercentPalette}
              setPalette={(newPalette) => {
                setState({
                  ...state,
                  palette: newPalette,
                });
              }}
            />
          </PalettePanelContainer>
        </EuiFormRow>
      )}
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metric.icon', {
          defaultMessage: 'Icon decoration',
        })}
      >
        <IconSelect
          customIconSet={metricIconsSet}
          value={state?.icon}
          onChange={(newIcon) => {
            setState({
              ...state,
              icon: newIcon,
            });
          }}
        />
      </EuiFormRow>
    </>
  );
}

function StaticColorControls({
  state,
  setState,
  isMetricNumeric,
}: Pick<Props, 'state' | 'setState'> & { isMetricNumeric: boolean }) {
  const colorLabel = i18n.translate('xpack.lens.metric.color', {
    defaultMessage: 'Color',
  });

  const setColor = useCallback(
    (color: string) => {
      setState({ ...state, color: color === '' ? undefined : color });
    },
    [setState, state]
  );

  const { inputValue: currentColor, handleInputChange: handleColorChange } =
    useDebouncedValue<string>(
      {
        onChange: setColor,
        value: state.color || getDefaultColor(state, isMetricNumeric),
      },
      { allowFalsyValue: true }
    );

  return (
    <EuiFormRow display="columnCompressed" fullWidth label={colorLabel}>
      <EuiColorPicker
        fullWidth
        compressed
        isClearable={false}
        onChange={(color: string) => handleColorChange(color)}
        color={currentColor}
        aria-label={colorLabel}
        showAlpha
        swatches={euiPaletteColorBlind()}
      />
    </EuiFormRow>
  );
}

export function DimensionEditorAdditionalSection({
  state,
  datasource,
  setState,
  addLayer,
  removeLayer,
  accessor,
  frame,
}: VisualizationDimensionEditorProps<MetricVisualizationState>) {
  const { euiTheme } = useEuiTheme();

  const isMetricNumeric = isMetricNumericType(datasource, accessor);
  if (accessor !== state.metricAccessor || !isMetricNumeric) {
    return null;
  }

  const idPrefix = htmlIdGenerator()();

  const hasDefaultTimeField = datasource?.hasDefaultTimeField();
  const metricHasReducedTimeRange = Boolean(
    state.metricAccessor &&
      datasource?.getOperationForColumnId(state.metricAccessor)?.hasReducedTimeRange
  );
  const secondaryMetricHasReducedTimeRange = Boolean(
    state.secondaryMetricAccessor &&
      datasource?.getOperationForColumnId(state.secondaryMetricAccessor)?.hasReducedTimeRange
  );

  const supportingVisHelpTexts: string[] = [];

  const supportsTrendline =
    hasDefaultTimeField && !metricHasReducedTimeRange && !secondaryMetricHasReducedTimeRange;

  if (!supportsTrendline) {
    supportingVisHelpTexts.push(
      !hasDefaultTimeField
        ? i18n.translate('xpack.lens.metric.supportingVis.needDefaultTimeField', {
            defaultMessage:
              'Line visualizations require use of a data view with a default time field.',
          })
        : metricHasReducedTimeRange
        ? i18n.translate('xpack.lens.metric.supportingVis.metricHasReducedTimeRange', {
            defaultMessage:
              'Line visualizations cannot be used when a reduced time range is applied to the primary metric.',
          })
        : secondaryMetricHasReducedTimeRange
        ? i18n.translate('xpack.lens.metric.supportingVis.secondaryMetricHasReducedTimeRange', {
            defaultMessage:
              'Line visualizations cannot be used when a reduced time range is applied to the secondary metric.',
          })
        : ''
    );
  }

  if (!state.maxAccessor) {
    supportingVisHelpTexts.push(
      i18n.translate('xpack.lens.metric.summportingVis.needMaxDimension', {
        defaultMessage: 'Bar visualizations require a maximum value to be defined.',
      })
    );
  }

  const buttonIdPrefix = `${idPrefix}--`;

  return (
    <div className="lnsIndexPatternDimensionEditor--padded lnsIndexPatternDimensionEditor--collapseNext">
      <EuiText
        size="s"
        css={css`
          margin-bottom: ${euiTheme.size.base};
        `}
      >
        <h4>
          {i18n.translate('xpack.lens.metric.supportingVis.label', {
            defaultMessage: 'Supporting visualization',
          })}
        </h4>
      </EuiText>

      <>
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.metric.supportingVis.type', {
            defaultMessage: 'Type',
          })}
          helpText={supportingVisHelpTexts.map((text) => (
            <p>{text}</p>
          ))}
        >
          <EuiButtonGroup
            isFullWidth
            buttonSize="compressed"
            legend={i18n.translate('xpack.lens.metric.supportingVis.type', {
              defaultMessage: 'Type',
            })}
            data-test-subj="lnsMetric_supporting_visualization_buttons"
            options={[
              {
                id: `${buttonIdPrefix}none`,
                label: i18n.translate('xpack.lens.metric.supportingVisualization.none', {
                  defaultMessage: 'None',
                }),
                'data-test-subj': 'lnsMetric_supporting_visualization_none',
              },
              {
                id: `${buttonIdPrefix}trendline`,
                label: i18n.translate('xpack.lens.metric.supportingVisualization.trendline', {
                  defaultMessage: 'Line',
                }),
                isDisabled: !supportsTrendline,
                'data-test-subj': 'lnsMetric_supporting_visualization_trendline',
              },
              {
                id: `${buttonIdPrefix}bar`,
                label: i18n.translate('xpack.lens.metric.supportingVisualization.bar', {
                  defaultMessage: 'Bar',
                }),
                isDisabled: !state.maxAccessor,
                'data-test-subj': 'lnsMetric_supporting_visualization_bar',
              },
            ]}
            idSelected={`${buttonIdPrefix}${
              state.trendlineLayerId ? 'trendline' : showingBar(state) ? 'bar' : 'none'
            }`}
            onChange={(id) => {
              const supportingVisualizationType = id.split('--')[1] as SupportingVisType;
              switch (supportingVisualizationType) {
                case 'trendline':
                  setState({
                    ...state,
                    showBar: false,
                  });
                  addLayer('metricTrendline');
                  break;
                case 'bar':
                  setState({
                    ...state,
                    showBar: true,
                  });
                  if (state.trendlineLayerId) removeLayer(state.trendlineLayerId);
                  break;
                case 'none':
                  setState({
                    ...state,
                    showBar: false,
                  });
                  if (state.trendlineLayerId) removeLayer(state.trendlineLayerId);
                  break;
              }
            }}
          />
        </EuiFormRow>
        {showingBar(state) && (
          <EuiFormRow
            label={i18n.translate('xpack.lens.metric.progressDirectionLabel', {
              defaultMessage: 'Bar orientation',
            })}
            fullWidth
            display="columnCompressed"
          >
            <EuiButtonGroup
              isFullWidth
              buttonSize="compressed"
              legend={i18n.translate('xpack.lens.metric.progressDirectionLabel', {
                defaultMessage: 'Bar orientation',
              })}
              data-test-subj="lnsMetric_progress_direction_buttons"
              options={[
                {
                  id: `${idPrefix}vertical`,
                  label: i18n.translate('xpack.lens.metric.progressDirection.vertical', {
                    defaultMessage: 'Vertical',
                  }),
                  'data-test-subj': 'lnsMetric_progress_bar_vertical',
                },
                {
                  id: `${idPrefix}horizontal`,
                  label: i18n.translate('xpack.lens.metric.progressDirection.horizontal', {
                    defaultMessage: 'Horizontal',
                  }),
                  'data-test-subj': 'lnsMetric_progress_bar_horizontal',
                },
              ]}
              idSelected={`${idPrefix}${state.progressDirection ?? 'vertical'}`}
              onChange={(id) => {
                const newDirection = id.replace(idPrefix, '') as LayoutDirection;
                setState({
                  ...state,
                  progressDirection: newDirection,
                });
              }}
            />
          </EuiFormRow>
        )}
      </>
    </div>
  );
}
