/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiFormRow,
  EuiButtonGroup,
  EuiFieldNumber,
  htmlIdGenerator,
  EuiColorPicker,
  EuiSpacer,
  useEuiTheme,
  EuiColorPalettePicker,
} from '@elastic/eui';
import type { LayoutDirection } from '@elastic/charts';
import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { PaletteRegistry } from '@kbn/coloring';
import {
  CustomizablePalette,
  DEFAULT_MAX_STOP,
  DEFAULT_MIN_STOP,
  applyPaletteParams,
} from '@kbn/coloring';
import { getDataBoundsForPalette } from '@kbn/expression-metric-vis-plugin/public';
import { getColumnByAccessor } from '@kbn/chart-expressions-common';
import { DebouncedInput, IconSelect } from '@kbn/visualization-ui-components';
import { useDebouncedValue } from '@kbn/visualization-utils';
import { KbnPalette, useKbnPalettes } from '@kbn/palettes';
import type {
  VisualizationDimensionEditorProps,
  MetricVisualizationState,
  SecondaryTrend,
  SecondaryTrendType,
} from '@kbn/lens-common';
import { css } from '@emotion/react';
import {
  LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR,
  LENS_METRIC_GROUP_ID,
  LENS_METRIC_STATE_DEFAULTS,
  LENS_LEGACY_METRIC_STATE_DEFAULTS,
} from '@kbn/lens-common';
import { PalettePanelContainer, getAccessorType } from '../../shared_components';
import { defaultNumberPaletteParams, defaultPercentagePaletteParams } from './palette_config';
import { DEFAULT_MAX_COLUMNS, getDefaultColor, showingBar } from './visualization';
import { CollapseSetting } from '../../shared_components/collapse_setting';
import { metricIconsSet } from '../../shared_components/icon_set';
import { getColorMode, getDefaultConfigForMode, getSecondaryLabelSelected } from './helpers';

export type SupportingVisType = 'none' | 'bar' | 'trendline';

export type ApplyColor = 'background' | 'value';

export type Props = VisualizationDimensionEditorProps<MetricVisualizationState> & {
  paletteService: PaletteRegistry;
};

type SubProps = VisualizationDimensionEditorProps<MetricVisualizationState> & { idPrefix: string };

export function DimensionEditor(
  props: VisualizationDimensionEditorProps<MetricVisualizationState>
) {
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
    <div className="lnsIndexPatternDimensionEditor--padded">
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
    </div>
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
          {!isPrimaryMetricOptionSelected ? (
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
  const defaultSecondaryLabel = columnName || '';
  const { isNumeric: isNumericType } = getAccessorType(datasource, accessor);
  const { isNumeric: isPrimaryMetricNumeric } = getAccessorType(datasource, state.metricAccessor);
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
        : LENS_METRIC_SECONDARY_DEFAULT_STATIC_COLOR,
    [state]
  );

  const secondaryLabelConfig = getSecondaryLabelSelected(state, {
    defaultSecondaryLabel,
    colorMode,
    isPrimaryMetricNumeric,
  });

  return (
    <div className="lnsIndexPatternDimensionEditor--padded">
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metric.secondaryLabel', {
          defaultMessage: 'Label',
        })}
      >
        <>
          <EuiButtonGroup
            isFullWidth
            buttonSize="compressed"
            legend={i18n.translate('xpack.lens.metric.secondaryLabel', {
              defaultMessage: 'Label',
            })}
            data-test-subj="lnsMetric_seondaryLabel_buttons"
            options={[
              {
                id: `${idPrefix}auto`,
                label: i18n.translate('xpack.lens.metric.seondaryLabel.auto', {
                  defaultMessage: 'Auto',
                }),
                'data-test-subj': 'lnsMetric_seondaryLabel_auto',
                value: undefined,
              },
              {
                id: `${idPrefix}custom`,
                label: i18n.translate('xpack.lens.metric.seondaryLabel.custom', {
                  defaultMessage: 'Custom',
                }),
                'data-test-subj': 'lnsMetric_seondaryLabel_custom',
                value: defaultSecondaryLabel,
              },
              {
                id: `${idPrefix}none`,
                label: i18n.translate('xpack.lens.metric.seondaryLabel.none', {
                  defaultMessage: 'None',
                }),
                'data-test-subj': 'lnsMetric_seondaryLabel_none',
                value: '',
              },
            ]}
            idSelected={`${idPrefix}${secondaryLabelConfig.mode}`}
            onChange={(_id, secondaryLabel) => {
              setState({
                ...state,
                secondaryLabel,
              });
            }}
          />
          {secondaryLabelConfig.mode === 'custom' && (
            <>
              <EuiSpacer size="s" />
              <DebouncedInput
                data-test-subj="lnsMetric_prefix_custom_input"
                compressed
                value={secondaryLabelConfig.label}
                onChange={(newSecondaryLabel) => {
                  setState({
                    ...state,
                    secondaryLabel: newSecondaryLabel,
                  });
                }}
              />
            </>
          )}
        </>
      </EuiFormRow>

      {/* When the label is visible, choose whether before or after the value */}
      {secondaryLabelConfig.mode !== 'none' && (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.metric.secondaryMetric.labelPosition', {
            defaultMessage: 'Label position',
          })}
        >
          <EuiButtonGroup
            isFullWidth
            buttonSize="compressed"
            legend={i18n.translate('xpack.lens.metric.secondaryMetric.labelPosition', {
              defaultMessage: 'Label position',
            })}
            options={[
              {
                id: `${idPrefix}before`,
                label: i18n.translate('xpack.lens.metric.secondaryMetric.labelPosition.before', {
                  defaultMessage: 'Before',
                }),
                value: 'before',
              },
              {
                id: `${idPrefix}after`,
                label: i18n.translate('xpack.lens.metric.secondaryMetric.labelPosition.after', {
                  defaultMessage: 'After',
                }),
                value: 'after',
              },
            ]}
            idSelected={`${idPrefix}${
              state.secondaryLabelPosition ?? LENS_METRIC_STATE_DEFAULTS.secondaryLabelPosition
            }`}
            onChange={(_id, secondaryLabelPosition) => {
              setState({
                ...state,
                secondaryLabelPosition,
              });
            }}
          />
        </EuiFormRow>
      )}

      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.secondaryMetric.colorMode.label', {
          defaultMessage: 'Color mode',
        })}
      >
        <EuiButtonGroup
          isFullWidth
          buttonSize="compressed"
          legend={i18n.translate('xpack.lens.secondaryMetric.colorMode.label', {
            defaultMessage: 'Color mode',
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
        <StaticColorControl getColor={getColor} setColor={setColor} />
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
    </div>
  );
}

const supportingVisualization = (state: MetricVisualizationState) =>
  state.trendlineLayerId ? 'trendline' : showingBar(state) ? 'bar' : 'panel';

function PrimaryMetricEditor({ state, setState, datasource, accessor }: SubProps) {
  const { isNumeric: isMetricNumeric } = getAccessorType(datasource, accessor);
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

  const showStaticColorControl = !isMetricNumeric;

  return (
    <div
      className="lnsIndexPatternDimensionEditor--padded"
      css={css`
        margin-bottom: -8px;
      `}
    >
      {showStaticColorControl ? (
        <StaticColorControl getColor={getColor} setColor={setColor} />
      ) : null}
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
            if (state.icon === newIcon) return;

            // If no icon selected, remove icon and iconAlign properties from the state
            if (newIcon === 'empty') {
              const { icon, iconAlign, ...restState } = state;
              setState({ ...restState });
              return;
            }

            // If both icon and iconAlign are set, only update icon
            if (state.icon && state.iconAlign) {
              setState({
                ...state,
                icon: newIcon,
              });
              return;
            }

            // If icon is set but iconAlign is missing, set legacy align
            // same check as in x-pack/platform/plugins/shared/lens/public/visualizations/metric/to_expression.ts
            if (state.icon && !state.iconAlign) {
              setState({
                ...state,
                icon: newIcon,
                iconAlign: LENS_LEGACY_METRIC_STATE_DEFAULTS.iconAlign,
              });
              return;
            }

            // If icon is missing, always set iconAlign to the default
            setState({
              ...state,
              icon: newIcon,
              iconAlign: LENS_METRIC_STATE_DEFAULTS.iconAlign,
            });
          }}
        />
      </EuiFormRow>
    </div>
  );
}

const visTextColorSwatches = ({
  euiTheme: {
    colors: { vis },
  },
}: UseEuiTheme) => [
  vis.euiColorVisText0,
  vis.euiColorVisText1,
  vis.euiColorVisText2,
  vis.euiColorVisText3,
  vis.euiColorVisText4,
  vis.euiColorVisText5,
  vis.euiColorVisText6,
  vis.euiColorVisText7,
  vis.euiColorVisText8,
  vis.euiColorVisText9,
];

function StaticColorControl({
  getColor,
  setColor,
  swatches,
}: {
  getColor: () => string;
  setColor: (color: string) => void;
  swatches?: string[];
}) {
  const colorLabel = i18n.translate('xpack.lens.metric.colorLabel', {
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
        onChange={handleColorChange}
        color={currentColor}
        aria-label={colorLabel}
        showAlpha
        swatches={swatches}
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
  paletteService,
  panelRef,
  isInlineEditing,
}: Props) {
  const euiThemeContext = useEuiTheme();

  const { isNumeric: isMetricNumeric } = getAccessorType(datasource, accessor);

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

  const selectedSupportingVisualization = supportingVisualization(state);

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

  const displayStops = applyPaletteParams(paletteService, activePalette, {
    min: currentMinMax.min ?? DEFAULT_MIN_STOP,
    max: currentMinMax.max ?? DEFAULT_MAX_STOP,
  });

  const showVisTextColorSwatches =
    supportingVisualization(state) === 'panel' && state.applyColorTo === 'value';

  const colorMode = state.palette ? 'dynamic' : 'static';

  return (
    <div
      className="lnsIndexPatternDimensionEditor--padded"
      css={css`
        padding-top: 0 !important;
      `}
    >
      <EuiFormRow
        display="columnCompressed"
        fullWidth
        label={i18n.translate('xpack.lens.metric.backgroundChartLabel', {
          defaultMessage: 'Background chart',
        })}
        helpText={supportingVisHelpTexts.map((text) => (
          <p>{text}</p>
        ))}
      >
        <EuiButtonGroup
          isFullWidth
          buttonSize="compressed"
          legend={i18n.translate('xpack.lens.metric.backgroundChartLabel', {
            defaultMessage: 'Background chart',
          })}
          data-test-subj="lnsMetric_supporting_visualization_buttons"
          options={[
            {
              id: `${buttonIdPrefix}panel`,
              label: i18n.translate('xpack.lens.metric.backgroundChartNoneLabel', {
                defaultMessage: 'None',
              }),
              value: 'panel',
              'data-test-subj': 'lnsMetric_background_chart_none',
            },
            {
              id: `${buttonIdPrefix}trendline`,
              label: i18n.translate('xpack.lens.metric.sbackgroundChartLineLabel', {
                defaultMessage: 'Line',
              }),
              isDisabled: !supportsTrendline,
              value: 'trendline',
              'data-test-subj': 'lnsMetric_background_chart_line',
            },
            {
              id: `${buttonIdPrefix}bar`,
              label: i18n.translate('xpack.lens.metric.backgroundChartBarLabel', {
                defaultMessage: 'Bar',
              }),
              isDisabled: !state.maxAccessor,
              value: 'bar',
              'data-test-subj': 'lnsMetric_background_chart_bar',
            },
          ]}
          idSelected={`${buttonIdPrefix}${selectedSupportingVisualization}`}
          onChange={(_id, value) => {
            const supportingVisualizationType = value as SupportingVisType;
            if (supportingVisualizationType === supportingVisualization(state)) return;

            setState({
              ...state,
              showBar: supportingVisualizationType === 'bar',
              applyColorTo: LENS_METRIC_STATE_DEFAULTS.applyColorTo,
            });

            if (supportingVisualizationType === 'trendline') {
              addLayer('metricTrendline');
            } else if (state.trendlineLayerId) {
              removeLayer(state.trendlineLayerId);
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
      {selectedSupportingVisualization === 'panel' && (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.metric.supportingVis.applyColorTo', {
            defaultMessage: 'Apply color to',
          })}
          helpText={
            state.applyColorTo === 'value' && !state.palette ? (
              <div>
                {i18n.translate(
                  'xpack.lens.metric.supportingVis.applyColorTo.staticColorValueHelp',
                  {
                    defaultMessage:
                      'Color palette has been automatically adjusted for provide the required contrast for text elements.',
                  }
                )}
              </div>
            ) : state.applyColorTo === 'value' && state.palette ? (
              <div>
                {i18n.translate(
                  'xpack.lens.metric.supportingVis.applyColorTo.dynamicColorvalueHelp',
                  {
                    defaultMessage: 'Color scales might cause accessibility issues.',
                  }
                )}
              </div>
            ) : undefined
          }
        >
          <EuiButtonGroup
            isFullWidth
            buttonSize="compressed"
            legend={i18n.translate('xpack.lens.metric.supportingVis.applyColorTo', {
              defaultMessage: 'Apply color to',
            })}
            data-test-subj="lnsMetric_apply_color_to_buttons"
            options={[
              {
                id: `${buttonIdPrefix}background`,
                label: i18n.translate('xpack.lens.metric.supportingVis.applyColorTo.background', {
                  defaultMessage: 'Background',
                }),
                value: 'background',
              },
              {
                id: `${buttonIdPrefix}value`,
                label: i18n.translate('xpack.lens.metric.supportingVis.applyColorTo.value', {
                  defaultMessage: 'Value',
                }),
                value: 'value',
              },
            ]}
            idSelected={`${buttonIdPrefix}${
              state.applyColorTo ?? LENS_METRIC_STATE_DEFAULTS.applyColorTo
            }`}
            onChange={(_id, newApplyColorTo) => {
              setState({
                ...state,
                applyColorTo: newApplyColorTo,
              });
            }}
          />
        </EuiFormRow>
      )}
      {isMetricNumeric && (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.metric.colorMode.label', {
            defaultMessage: 'Color mode',
          })}
        >
          <EuiButtonGroup
            isFullWidth
            buttonSize="compressed"
            legend={i18n.translate('xpack.lens.metric.colorMode.label', {
              defaultMessage: 'Color mode',
            })}
            data-test-subj="lnsMetric_color_mode_buttons"
            options={[
              {
                id: `${idPrefix}static`,
                label: i18n.translate('xpack.lens.metric.colorMode.static', {
                  defaultMessage: 'Static',
                }),
                value: 'static',
                'data-test-subj': 'lnsMetric_color_mode_static',
              },
              {
                id: `${idPrefix}dynamic`,
                label: i18n.translate('xpack.lens.metric.colorMode.dynamic', {
                  defaultMessage: 'Dynamic',
                }),
                value: 'dynamic',
                'data-test-subj': 'lnsMetric_color_mode_dynamic',
              },
            ]}
            idSelected={`${idPrefix}${colorMode}`}
            onChange={(_id, newColorMode) => {
              if (newColorMode === colorMode) return;

              setState({
                ...state,
                ...(newColorMode === 'dynamic'
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
                    }),
              });
            }}
          />
        </EuiFormRow>
      )}
      {hasDynamicColoring ? (
        <EuiFormRow
          display="columnCompressed"
          fullWidth
          label={i18n.translate('xpack.lens.metric.dynamicColorMapping.label', {
            defaultMessage: 'Dynamic color mapping',
          })}
          css={css`
            // Center the field wrapper
            .euiFormRow__fieldWrapper {
              display: flex;
              align-items: center;
            }
          `}
        >
          <PalettePanelContainer
            palette={displayStops.map(({ color }) => color)}
            siblingRef={panelRef}
            isInlineEditing={isInlineEditing}
          >
            <CustomizablePalette
              palettes={paletteService}
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
        <StaticColorControl
          getColor={getColor}
          setColor={setColor}
          {...(showVisTextColorSwatches
            ? { swatches: visTextColorSwatches(euiThemeContext) }
            : undefined)}
        />
      )}
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
  if (!isMetricNumeric || groupId !== LENS_METRIC_GROUP_ID.BREAKDOWN_BY) {
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
