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
  EuiColorPalettePicker,
} from '@elastic/eui';
import { LayoutDirection } from '@elastic/charts';
import React, { useCallback, useMemo, useState } from 'react';
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
import { KbnPalette, useKbnPalettes } from '@kbn/palettes';
import { PalettePanelContainer, getAccessorType } from '../../shared_components';
import type { VisualizationDimensionEditorProps } from '../../types';
import { defaultNumberPaletteParams, defaultPercentagePaletteParams } from './palette_config';
import { DEFAULT_MAX_COLUMNS, getDefaultColor, showingBar } from './visualization';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { MetricVisualizationState, SecondaryTrend, SecondaryTrendType } from './types';
import { metricIconsSet } from '../../shared_components/icon_set';
import { getColorMode, getDefaultConfigForMode, getPrefixSelected } from './helpers';
import { SECONDARY_DEFAULT_STATIC_COLOR, GROUP_ID } from './constants';

export type SupportingVisType = 'none' | 'bar' | 'trendline';

export type Props = VisualizationDimensionEditorProps<MetricVisualizationState> & {
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
    </>
  );
}

function MaximumEditor({ setState, state, idPrefix }: SubProps) {
  return null;
}

interface TrendPalette {
  // select id
  id: string;
  // original ref to the palette
  paletteId: string;
  name: string;
  reversed?: boolean;
  colors: [string, string, string];
}

type SecondaryTrendConfigByType<T extends SecondaryTrendType> = Extract<
  NonNullable<MetricVisualizationState['secondaryTrend']>,
  { type: T }
>;

const reversePostfix = '--reversed';
function useTrendPalettes(): { defaultPalette: TrendPalette; allPalettes: TrendPalette[] } {
  const palettes = useKbnPalettes();
  const computedPalettes = useMemo(() => {
    const defaultKbnPalette = palettes.get(KbnPalette.CompareTo);
    const trendPalettes = new Set<string>([KbnPalette.Complementary, KbnPalette.Temperature]);
    const defaultPalette = {
      id: defaultKbnPalette.id,
      paletteId: defaultKbnPalette.id,
      name: defaultKbnPalette.name,
      reversed: false,
      colors: defaultKbnPalette.colors(3) as [string, string, string],
    };
    return {
      defaultPalette,
      allPalettes: [
        defaultPalette,
        {
          ...defaultPalette,
          id: `${KbnPalette.CompareTo}${reversePostfix}`,
          name: i18n.translate(
            'xpack.lens.secondaryMetric.compareTo.dynamicColoring.palette.trendReversed.label',
            {
              defaultMessage: 'Trend reversed',
            }
          ),
          reversed: true,
        },
        ...palettes
          .getAll()
          .filter(({ id }) => trendPalettes.has(id))
          .map(({ id, colors, name }) => ({
            id,
            paletteId: id,
            name,
            colors: colors(3) as [string, string, string],
            reversed: false,
          })),
      ],
    };
  }, [palettes]);
  return computedPalettes;
}

function TrendEditor({
  accessor,
  idPrefix,
  setState,
  state,
  datasource,
}: Pick<SubProps, 'accessor' | 'idPrefix' | 'setState' | 'state' | 'datasource'>) {
  const { isNumeric: secondaryMetricCanTrend } = getAccessorType(datasource, accessor);
  const { isNumeric: primaryMetricCanTrend } = getAccessorType(datasource, state?.metricAccessor);
  const { defaultPalette, allPalettes } = useTrendPalettes();

  // Translate palette to show it on the picker UI
  const palettesToShow = useMemo(
    () =>
      allPalettes.map(({ id, name, colors, reversed }) => ({
        value: id,
        title: name,
        palette: reversed ? colors.slice().reverse() : colors,
        type: 'fixed' as const,
      })),
    [allPalettes]
  );

  const canShowTrend = secondaryMetricCanTrend;
  if (!canShowTrend) {
    return null;
  }
  const secondaryTrend = state.secondaryTrend;
  if (!secondaryTrend || secondaryTrend.type !== 'dynamic') {
    return null;
  }

  const selectedPalette = secondaryTrend
    ? allPalettes.find(
        ({ paletteId, reversed }) =>
          paletteId === secondaryTrend.paletteId && reversed === secondaryTrend.reversed
      ) || defaultPalette
    : defaultPalette;

  const isPrimaryMetricOptionSelected =
    secondaryTrend.baselineValue === 'primary' && primaryMetricCanTrend;

  return (
    <>
      <EuiFormRow
        display="columnCompressed"
        label={i18n.translate(
          'xpack.lens.secondaryMetric.compareTo.staticColoring.palettePicker.label',
          {
            defaultMessage: 'Color palette',
          }
        )}
        fullWidth
      >
        <EuiColorPalettePicker
          fullWidth
          data-test-subj="lnsMetric_secondary_trend_palette"
          compressed
          palettes={palettesToShow}
          onChange={(newPalette) => {
            const paletteDefinition = allPalettes.find(({ id }) => id === newPalette);
            if (!paletteDefinition) {
              return;
            }
            setState({
              ...state,
              secondaryTrend: {
                ...secondaryTrend,
                paletteId: paletteDefinition.paletteId,
                reversed: Boolean(paletteDefinition.reversed),
              },
            });
          }}
          valueOfSelected={selectedPalette.id}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metric.secondaryMetric.compareTo.display', {
          defaultMessage: 'Display',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          buttonSize="compressed"
          legend={i18n.translate('xpack.lens.metric.secondaryMetric.compareTo.display', {
            defaultMessage: 'Display',
          })}
          data-test-subj="lnsMetric_secondary_trend_display_buttons"
          options={[
            {
              id: `${idPrefix}display_icon`,
              label: i18n.translate('xpack.lens.metric.secondaryMetric.compareTo.display.icon', {
                defaultMessage: 'Icon',
              }),
              'data-test-subj': 'lnsMetric_secondary_trend_display_icon',
            },
            {
              id: `${idPrefix}display_value`,
              label: i18n.translate('xpack.lens.metric.secondaryMetric.compareTo.display.value', {
                defaultMessage: 'Value',
              }),
              'data-test-subj': 'lnsMetric_secondary_trend_display_value',
            },
            {
              id: `${idPrefix}display_both`,
              label: i18n.translate('xpack.lens.metric.secondaryMetric.compareTo.display.both', {
                defaultMessage: 'Both',
              }),
              'data-test-subj': 'lnsMetric_secondary_trend_display_both',
            },
          ]}
          idSelected={`${idPrefix}display_${secondaryTrend?.visuals || 'both'}`}
          onChange={(id) => {
            const visualsMode = id.replace(
              `${idPrefix}display_`,
              ''
            ) as SecondaryTrendConfigByType<'dynamic'>['visuals'];

            setState({
              ...state,
              secondaryTrend: {
                ...secondaryTrend,
                visuals: visualsMode || ('both' as const),
              },
            });
          }}
        />
      </EuiFormRow>
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metric.secondaryMetric.compareTo', {
          defaultMessage: 'Compare to',
        })}
        helpText={
          isPrimaryMetricOptionSelected
            ? i18n.translate('xpack.lens.metric.secondaryMetric.compareTo.primaryHelpText', {
                defaultMessage: 'Displays the trend as the primary metric minus the secondary.',
              })
            : undefined
        }
      >
        <>
          <EuiButtonGroup
            isFullWidth
            buttonSize="compressed"
            legend={i18n.translate('xpack.lens.metric.secondaryMetric.compareTo.baseline', {
              defaultMessage: 'Compare to',
            })}
            data-test-subj="lnsMetric_secondary_trend_baseline_buttons"
            options={[
              {
                id: `${idPrefix}static`,
                label: i18n.translate(
                  'xpack.lens.metric.secondaryMetric.compareTo.baseline.static',
                  {
                    defaultMessage: 'Static value',
                  }
                ),
                'data-test-subj': 'lnsMetric_secondary_trend_baseline_static',
              },
              {
                id: `${idPrefix}primary`,
                label: i18n.translate(
                  'xpack.lens.metric.secondaryMetric.compareTo.baseline.primary',
                  {
                    defaultMessage: 'Primary metric',
                  }
                ),
                'data-test-subj': 'lnsMetric_secondary_trend_baseline_primary',
                isDisabled: !primaryMetricCanTrend,
                toolTipContent: primaryMetricCanTrend
                  ? undefined
                  : i18n.translate(
                      'xpack.lens.metric.secondaryMetric.compareTo.baseline.primary.disabled',
                      {
                        defaultMessage: 'Primary metric must be numeric to use it as baseline',
                      }
                    ),
              },
            ]}
            idSelected={`${idPrefix}${isPrimaryMetricOptionSelected ? 'primary' : 'static'}`}
            onChange={(id) => {
              const baselineMode = id.replace(idPrefix, '') as 'static' | 'primary';

              setState({
                ...state,
                secondaryTrend: {
                  ...secondaryTrend,
                  baselineValue: baselineMode === 'primary' ? ('primary' as const) : 0,
                },
              });
            }}
          />
          <EuiSpacer size="s" />
          {secondaryTrend.baselineValue !== 'primary' ? (
            <DebouncedInput
              data-test-subj="lnsMetric_secondary_trend_baseline_input"
              compressed
              fullWidth
              defaultValue={'0'}
              type="number"
              value={
                typeof secondaryTrend?.baselineValue === 'number'
                  ? String(secondaryTrend.baselineValue)
                  : ''
              }
              onChange={(newValue) => {
                setState({
                  ...state,
                  secondaryTrend: {
                    ...secondaryTrend,
                    baselineValue: Number(newValue),
                  },
                });
              }}
            />
          ) : null}
        </>
      </EuiFormRow>
    </>
  );
}

function SecondaryMetricEditor({
  accessor,
  idPrefix,
  frame,
  layerId,
  setState,
  state,
  datasource,
}: SubProps) {
  const columnName = getColumnByAccessor(accessor, frame.activeData?.[layerId]?.columns)?.name;
  const defaultPrefix = columnName || '';
  const { isNumeric: isNumericType } = getAccessorType(datasource, accessor);
  const colorMode = getColorMode(state.secondaryTrend, isNumericType);
  const [prevColorConfig, setPrevColorConfig] = useState<{
    static: SecondaryTrendConfigByType<'static'> | undefined;
    dynamic: SecondaryTrendConfigByType<'dynamic'> | undefined;
  }>({
    dynamic: undefined,
    static: undefined,
  });

  const setColor = useCallback(
    (color: string) => {
      setState({ ...state, secondaryTrend: { type: 'static', color } });
    },
    [setState, state]
  );

  const getColor = useCallback(
    () =>
      state.secondaryTrend?.type === 'static'
        ? state.secondaryTrend.color
        : SECONDARY_DEFAULT_STATIC_COLOR,
    [state]
  );

  const prefixConfig = getPrefixSelected(state, { defaultPrefix, colorMode });

  return (
    <>
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
            idSelected={`${idPrefix}${prefixConfig.mode}`}
            onChange={(_id, secondaryPrefix) => {
              setState({
                ...state,
                secondaryPrefix,
              });
            }}
          />
          {prefixConfig.mode === 'custom' && (
            <>
              <EuiSpacer size="s" />
              <DebouncedInput
                data-test-subj="lnsMetric_prefix_custom_input"
                compressed
                value={prefixConfig.label}
                onChange={(newPrefix) => {
                  setState({
                    ...state,
                    secondaryPrefix: newPrefix,
                  });
                }}
              />
            </>
          )}
        </>
      </EuiFormRow>
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
          legend={i18n.translate('xpack.lens.metric.secondaryMetric.colorByValue.label', {
            defaultMessage: 'Color by value',
          })}
          data-test-subj="lnsMetric_color_mode_buttons"
          options={[
            {
              id: `${idPrefix}none`,
              label: i18n.translate('xpack.lens.metric.secondaryMetric.colorMode.none', {
                defaultMessage: 'None',
              }),
              'data-test-subj': 'lnsMetric_color_mode_none',
            },
            {
              id: `${idPrefix}static`,
              label: i18n.translate('xpack.lens.metric.secondaryMetric.colorMode.static', {
                defaultMessage: 'Static',
              }),
              'data-test-subj': 'lnsMetric_color_mode_static',
            },
            {
              id: `${idPrefix}dynamic`,
              label: i18n.translate('xpack.lens.metric.secondaryMetric.colorMode.dynamic', {
                defaultMessage: 'Dynamic',
              }),
              'data-test-subj': 'lnsMetric_color_mode_dynamic',
              isDisabled: !isNumericType,
              toolTipContent: isNumericType
                ? undefined
                : i18n.translate('xpack.lens.metric.secondaryMetric.colorMode.dynamic.disabled', {
                    defaultMessage: 'Dynamic coloring is only available for numeric fields',
                  }),
            },
          ]}
          idSelected={`${idPrefix}${colorMode}`}
          onChange={(id) => {
            const newColorMode = id.replace(idPrefix, '') as SecondaryTrendType;

            const secondaryTrend: SecondaryTrend =
              newColorMode !== 'none' && prevColorConfig[newColorMode] != null
                ? prevColorConfig[newColorMode]!
                : getDefaultConfigForMode(newColorMode);

            setState({
              ...state,
              secondaryTrend,
            });

            // save previous trend config
            if (state.secondaryTrend && state.secondaryTrend.type !== 'none') {
              setPrevColorConfig({
                ...prevColorConfig,
                [state.secondaryTrend!.type]: state.secondaryTrend,
              });
            }
          }}
        />
      </EuiFormRow>
      {colorMode === 'static' ? (
        <StaticColorControls getColor={getColor} setColor={setColor} />
      ) : null}
      {colorMode === 'dynamic' ? (
        <TrendEditor
          accessor={accessor}
          idPrefix={idPrefix}
          setState={setState}
          state={state}
          datasource={datasource}
        />
      ) : null}
    </>
  );
}

function PrimaryMetricEditor(props: SubProps) {
  const { state, setState, frame, accessor, idPrefix, isInlineEditing } = props;
  const { isNumeric: isMetricNumeric } = getAccessorType(props.datasource, accessor);

  const setColor = useCallback(
    (color: string) => {
      setState({ ...state, color: color === '' ? undefined : color });
    },
    [setState, state]
  );

  const getColor = useCallback(() => {
    return state.color || getDefaultColor(state, isMetricNumeric);
  }, [state, isMetricNumeric]);

  if (accessor == null) {
    return null;
  }

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
      {hasDynamicColoring ? (
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
      ) : (
        <StaticColorControls getColor={getColor} setColor={setColor} />
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
  getColor,
  setColor,
}: {
  getColor: () => string;
  setColor: (color: string) => void;
}) {
  const colorLabel = i18n.translate('xpack.lens.metric.color', {
    defaultMessage: 'Color',
  });

  const { inputValue: currentColor, handleInputChange: handleColorChange } =
    useDebouncedValue<string>(
      {
        onChange: setColor,
        value: getColor(),
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

  const { isNumeric: isMetricNumeric } = getAccessorType(datasource, accessor);
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

export function DimensionEditorDataExtraComponent({
  groupId,
  datasource,
  state,
  setState,
}: Omit<Props, 'paletteService'>) {
  const { isNumeric: isMetricNumeric } = getAccessorType(datasource, state.metricAccessor);
  if (!isMetricNumeric || groupId !== GROUP_ID.BREAKDOWN_BY) {
    return null;
  }
  return (
    <CollapseSetting
      value={state.collapseFn || ''}
      onChange={(collapseFn) => {
        setState({
          ...state,
          collapseFn,
        });
      }}
    />
  );
}
