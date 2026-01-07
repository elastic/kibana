/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { Ast } from '@kbn/interpreter';
import type { DatatableRow } from '@kbn/expressions-plugin/common';
import { buildExpressionFunction } from '@kbn/expressions-plugin/common';
import type { PaletteRegistry, CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import { CUSTOM_PALETTE, applyPaletteParams, getOverridePaletteStops } from '@kbn/coloring';
import type {
  GaugeExpressionFunctionDefinition,
  GaugeShape,
} from '@kbn/expression-gauge-plugin/common';
import { GaugeShapes } from '@kbn/expression-gauge-plugin/common';
import {
  getGoalValue,
  getMaxValue,
  getMinValue,
  getValueFromAccessor,
} from '@kbn/expression-gauge-plugin/public';
import { IconChartGauge } from '@kbn/chart-icons';
import { LayerTypes } from '@kbn/expression-xy-plugin/public';
import type {
  FormBasedPersistedState,
  DatasourceLayers,
  FramePublicAPI,
  OperationMetadata,
  Suggestion,
  UserMessage,
  Visualization,
} from '@kbn/lens-common';
import { getSuggestions } from './suggestions';
import type { GaugeVisualizationState } from './constants';
import { GROUP_ID, LENS_GAUGE_ID } from './constants';
import { GaugeDimensionEditor } from './dimension_editor';
import { generateId } from '../../id_generator';
import { getAccessorsFromState, getDefaultPalette } from './utils';
import {
  GAUGE_GOAL_GT_MAX,
  GAUGE_METRIC_GT_MAX,
  GAUGE_MIN_GT_GOAL,
  GAUGE_MIN_GT_MAX,
  GAUGE_MIN_GT_METRIC,
  GAUGE_MIN_NE_MAX,
} from '../../user_messages_ids';
import { FlyoutToolbar } from '../../shared_components/flyout_toolbar';
import { GaugeStyleSettings } from './toolbar_component';

interface GaugeVisualizationDeps {
  paletteService: PaletteRegistry;
}

export const isNumericMetric = (op: OperationMetadata) =>
  !op.isBucketed && op.dataType === 'number';

export const isNumericDynamicMetric = (op: OperationMetadata) =>
  isNumericMetric(op) && !op.isStaticValue;

function computePaletteParams(
  paletteService: PaletteRegistry,
  palette: PaletteOutput<CustomPaletteParams>
) {
  const stops = getOverridePaletteStops(paletteService, palette);

  return {
    ...palette.params,
    // rewrite colors and stops as two distinct arguments
    colors: stops?.map(({ color }) => color),
    stops: palette.params?.name === 'custom' ? stops?.map(({ stop }) => stop) : [],
    reverse: false, // managed at UI level
  };
}

const getErrorMessages = (row?: DatatableRow, state?: GaugeVisualizationState): UserMessage[] => {
  if (!row || !state) {
    return [];
  }

  const errors: UserMessage[] = [];

  const minAccessor = state?.minAccessor;
  const maxAccessor = state?.maxAccessor;
  const minValue = minAccessor ? getValueFromAccessor(minAccessor, row) : undefined;
  const maxValue = maxAccessor ? getValueFromAccessor(maxAccessor, row) : undefined;
  if (maxValue !== null && maxValue !== undefined && minValue != null && minValue !== undefined) {
    if (maxValue < minValue) {
      errors.push({
        uniqueId: GAUGE_MIN_GT_MAX,
        severity: 'error',
        displayLocations: [
          { id: 'dimensionButton', dimensionId: minAccessor! },
          { id: 'dimensionButton', dimensionId: maxAccessor! },
        ],
        fixableInEditor: true,
        shortMessage: i18n.translate(
          'xpack.lens.guageVisualization.chartCannotRenderMinGreaterMax',
          {
            defaultMessage: 'Minimum value may not be greater than maximum value',
          }
        ),
        longMessage: '',
      });
    }
    if (maxValue === minValue) {
      errors.push({
        uniqueId: GAUGE_MIN_NE_MAX,
        severity: 'error',
        displayLocations: [
          { id: 'dimensionButton', dimensionId: minAccessor! },
          { id: 'dimensionButton', dimensionId: maxAccessor! },
        ],
        fixableInEditor: true,
        shortMessage: i18n.translate('xpack.lens.guageVisualization.chartCannotRenderEqual', {
          defaultMessage: 'Minimum and maximum values may not be equal',
        }),
        longMessage: '',
      });
    }
  }

  return errors;
};

const toExpression = (
  paletteService: PaletteRegistry,
  state: GaugeVisualizationState,
  datasourceLayers: DatasourceLayers,
  attributes?: unknown,
  datasourceExpressionsByLayers: Record<string, Ast> | undefined = {}
): Ast | null => {
  const datasource = datasourceLayers[state.layerId];
  const datasourceExpression = datasourceExpressionsByLayers[state.layerId];

  const originalOrder = datasource?.getTableSpec().map(({ columnId }) => columnId);
  if (!originalOrder || !state.metricAccessor) {
    return null;
  }

  const gaugeFn = buildExpressionFunction<GaugeExpressionFunctionDefinition>('gauge', {
    metric: state.metricAccessor,
    min: state.minAccessor,
    max: state.maxAccessor,
    goal: state.goalAccessor,
    shape: state.shape ?? GaugeShapes.HORIZONTAL_BULLET,
    colorMode: state?.colorMode ?? 'none',
    palette: state.palette?.params
      ? paletteService
          .get(CUSTOM_PALETTE)
          .toExpression(computePaletteParams(paletteService, state.palette))
      : undefined,
    ticksPosition: state.ticksPosition ?? 'auto',
    labelMinor: state.labelMinor,
    labelMajor: state.labelMajor,
    labelMajorMode: state.labelMajorMode ?? 'auto',
  });

  return {
    type: 'expression',
    chain: [...(datasourceExpression?.chain ?? []), gaugeFn.toAst()],
  };
};

export const getGaugeVisualization = ({
  paletteService,
}: GaugeVisualizationDeps): Visualization<GaugeVisualizationState> => ({
  id: LENS_GAUGE_ID,
  getVisualizationTypeId() {
    return this.id;
  },
  visualizationTypes: [
    {
      id: LENS_GAUGE_ID,
      icon: IconChartGauge,
      label: i18n.translate('xpack.lens.gauge.label', {
        defaultMessage: 'Gauge',
      }),
      sortPriority: 7,
      description: i18n.translate('xpack.lens.gauge.visualizationDescription', {
        defaultMessage: 'Show progress to a goal in linear or arced style.',
      }),
      subtypes: [
        GaugeShapes.HORIZONTAL_BULLET,
        GaugeShapes.VERTICAL_BULLET,
        GaugeShapes.SEMI_CIRCLE,
        GaugeShapes.ARC,
        GaugeShapes.CIRCLE,
      ],
    },
  ],
  getLayerIds(state) {
    return [state.layerId];
  },
  clearLayer(state) {
    const newState = { ...state };
    delete newState.metricAccessor;
    delete newState.minAccessor;
    delete newState.maxAccessor;
    delete newState.goalAccessor;
    delete newState.palette;
    delete newState.colorMode;
    return newState;
  },

  getDescription() {
    return {
      icon: IconChartGauge,
      label: i18n.translate('xpack.lens.gauge.label', {
        defaultMessage: 'Gauge',
      }),
    };
  },

  switchVisualizationType: (visualizationTypeId, state) => {
    return {
      ...state,
      shape: visualizationTypeId as GaugeShape,
    };
  },

  initialize(addNewLayer, state, mainPalette) {
    return (
      state || {
        layerId: addNewLayer(),
        layerType: LayerTypes.DATA,
        shape: GaugeShapes.HORIZONTAL_BULLET,
        colorMode: 'palette',
        palette:
          mainPalette?.type === 'legacyPalette'
            ? mainPalette.value
            : getDefaultPalette(paletteService),
        ticksPosition: 'bands',
        labelMajorMode: 'auto',
      }
    );
  },
  getSuggestions: (params) => getSuggestions({ ...params, paletteService }),

  getConfiguration({ state, frame }) {
    const row = state?.layerId ? frame?.activeData?.[state?.layerId]?.rows?.[0] : undefined;
    const { palette, metricAccessor, accessors } = getConfigurationAccessorsAndPalette(
      state,
      paletteService,
      frame.activeData
    );

    return {
      groups: [
        {
          enableFormatSelector: true,
          layerId: state.layerId,
          groupId: GROUP_ID.METRIC,
          groupLabel: i18n.translate('xpack.lens.gauge.metricLabel', {
            defaultMessage: 'Metric',
          }),
          paramEditorCustomProps: {
            headingLabel: i18n.translate('xpack.lens.gauge.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          isMetricDimension: true,
          accessors: metricAccessor
            ? [
                palette
                  ? {
                      columnId: metricAccessor,
                      triggerIconType: 'colorBy',
                      palette,
                    }
                  : {
                      columnId: metricAccessor,
                      triggerIconType: 'none',
                    },
              ]
            : [],
          filterOperations: isNumericDynamicMetric,
          supportsMoreColumns: !metricAccessor,
          requiredMinDimensionCount: 1,
          dataTestSubj: 'lnsGauge_metricDimensionPanel',
          enableDimensionEditor: true,
        },
        {
          supportStaticValue: true,
          enableFormatSelector: false,
          layerId: state.layerId,
          groupId: GROUP_ID.MIN,
          groupLabel: i18n.translate('xpack.lens.gauge.minValueLabel', {
            defaultMessage: 'Minimum value',
          }),
          paramEditorCustomProps: {
            labels: [
              i18n.translate('xpack.lens.gauge.minValueLabel', {
                defaultMessage: 'Minimum value',
              }),
            ],
            headingLabel: i18n.translate('xpack.lens.gauge.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          isMetricDimension: true,
          accessors: state.minAccessor ? [{ columnId: state.minAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.minAccessor,
          dataTestSubj: 'lnsGauge_minDimensionPanel',
          prioritizedOperation: 'min',
          suggestedValue: () => (state.metricAccessor ? getMinValue(row, accessors) : undefined),
        },
        {
          supportStaticValue: true,
          enableFormatSelector: false,
          layerId: state.layerId,
          groupId: GROUP_ID.MAX,
          groupLabel: i18n.translate('xpack.lens.gauge.maxValueLabel', {
            defaultMessage: 'Maximum value',
          }),
          paramEditorCustomProps: {
            labels: [
              i18n.translate('xpack.lens.gauge.maxValueLabel', {
                defaultMessage: 'Maximum value',
              }),
            ],
            headingLabel: i18n.translate('xpack.lens.gauge.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          isMetricDimension: true,
          accessors: state.maxAccessor ? [{ columnId: state.maxAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.maxAccessor,
          dataTestSubj: 'lnsGauge_maxDimensionPanel',
          prioritizedOperation: 'max',
          suggestedValue: () => (state.metricAccessor ? getMaxValue(row, accessors) : undefined),
        },
        {
          supportStaticValue: true,
          enableFormatSelector: false,
          layerId: state.layerId,
          groupId: GROUP_ID.GOAL,
          groupLabel: i18n.translate('xpack.lens.gauge.goalValueLabel', {
            defaultMessage: 'Goal value',
          }),
          paramEditorCustomProps: {
            labels: [
              i18n.translate('xpack.lens.gauge.goalValueLabel', {
                defaultMessage: 'Goal value',
              }),
            ],
            headingLabel: i18n.translate('xpack.lens.gauge.headingLabel', {
              defaultMessage: 'Value',
            }),
          },
          isMetricDimension: true,
          accessors: state.goalAccessor ? [{ columnId: state.goalAccessor }] : [],
          filterOperations: isNumericMetric,
          supportsMoreColumns: !state.goalAccessor,
          requiredMinDimensionCount: 0,
          dataTestSubj: 'lnsGauge_goalDimensionPanel',
        },
      ],
    };
  },

  getDisplayOptions() {
    return {
      noPadding: true,
    };
  },

  setDimension({ prevState, layerId, columnId, groupId, previousColumn }) {
    const update: Partial<GaugeVisualizationState> = {};
    if (groupId === GROUP_ID.MIN) {
      update.minAccessor = columnId;
    }
    if (groupId === GROUP_ID.MAX) {
      update.maxAccessor = columnId;
    }
    if (groupId === GROUP_ID.GOAL) {
      update.goalAccessor = columnId;
    }
    if (groupId === GROUP_ID.METRIC) {
      update.metricAccessor = columnId;
    }
    return {
      ...prevState,
      ...update,
    };
  },

  removeDimension({ prevState, layerId, columnId }) {
    const update = { ...prevState };

    if (prevState.goalAccessor === columnId) {
      delete update.goalAccessor;
    }
    if (prevState.minAccessor === columnId) {
      delete update.minAccessor;
    }
    if (prevState.maxAccessor === columnId) {
      delete update.maxAccessor;
    }
    if (prevState.metricAccessor === columnId) {
      delete update.metricAccessor;
      delete update.palette;
      delete update.colorMode;
      update.ticksPosition = 'auto';
    }

    return update;
  },

  DimensionEditorComponent(props) {
    return <GaugeDimensionEditor {...props} paletteService={paletteService} />;
  },

  FlyoutToolbarComponent(props) {
    return <FlyoutToolbar {...props} contentMap={{ style: GaugeStyleSettings }} />;
  },

  getSupportedLayers(state, frame) {
    const row = state?.layerId ? frame?.activeData?.[state?.layerId]?.rows?.[0] : undefined;
    const accessors = getAccessorsFromState(state);
    const minValue = getMinValue(row, accessors);
    const maxValue = getMaxValue(row, accessors);
    const goalValue = getGoalValue(row, accessors);

    return [
      {
        type: LayerTypes.DATA,
        label: i18n.translate('xpack.lens.gauge.addLayer', {
          defaultMessage: 'Visualization',
        }),
        initialDimensions: state
          ? [
              {
                groupId: 'min',
                columnId: generateId(),
                staticValue: minValue,
              },
              {
                groupId: 'max',
                columnId: generateId(),
                staticValue: maxValue,
              },
              {
                groupId: 'goal',
                columnId: generateId(),
                staticValue: goalValue,
              },
            ]
          : undefined,
      },
    ];
  },

  getLayerType(layerId, state) {
    if (state?.layerId === layerId) {
      return state.layerType;
    }
  },

  toExpression: (state, datasourceLayers, attributes, datasourceExpressionsByLayers = {}) =>
    toExpression(
      paletteService,
      state,
      datasourceLayers,
      { ...attributes },
      datasourceExpressionsByLayers
    ),

  toPreviewExpression: (state, datasourceLayers, datasourceExpressionsByLayers = {}) =>
    toExpression(paletteService, state, datasourceLayers, undefined, datasourceExpressionsByLayers),

  getUserMessages(state, { frame }) {
    const { maxAccessor, minAccessor, goalAccessor, metricAccessor } = state;
    if (!maxAccessor && !minAccessor && !goalAccessor && !metricAccessor) {
      // nothing configured yet
      return [];
    }
    if (!metricAccessor) {
      return [];
    }

    const row = frame.activeData?.[state.layerId]?.rows?.[0];
    if (!row) {
      return [];
    }

    const errors = getErrorMessages(row, state);
    if (errors.length) {
      return errors;
    }

    const metricValue = row[metricAccessor];
    const maxValue = maxAccessor && row[maxAccessor];
    const minValue = minAccessor && row[minAccessor];
    const goalValue = goalAccessor && row[goalAccessor];

    const warnings: UserMessage[] = [];
    if (typeof minValue === 'number') {
      if (minValue > metricValue) {
        warnings.push({
          uniqueId: GAUGE_MIN_GT_METRIC,
          severity: 'warning',
          fixableInEditor: true,
          displayLocations: [{ id: 'toolbar' }],
          shortMessage: '',
          longMessage: (
            <FormattedMessage
              id="xpack.lens.gaugeVisualization.minValueGreaterMetricShortMessage"
              defaultMessage="Minimum value is greater than metric value."
            />
          ),
        });
      }
      if (minValue > goalValue) {
        warnings.push({
          uniqueId: GAUGE_MIN_GT_GOAL,
          severity: 'warning',
          fixableInEditor: true,
          displayLocations: [{ id: 'toolbar' }],
          shortMessage: '',
          longMessage: (
            <FormattedMessage
              id="xpack.lens.gaugeVisualization.minimumValueGreaterGoalShortMessage"
              defaultMessage="Minimum value is greater than goal value."
            />
          ),
        });
      }
    }

    if (typeof maxValue === 'number') {
      if (metricValue > maxValue) {
        warnings.push({
          uniqueId: GAUGE_METRIC_GT_MAX,
          severity: 'warning',
          fixableInEditor: true,
          displayLocations: [{ id: 'toolbar' }],
          shortMessage: '',
          longMessage: (
            <FormattedMessage
              id="xpack.lens.gaugeVisualization.metricValueGreaterMaximumShortMessage"
              defaultMessage="Metric value is greater than maximum value."
            />
          ),
        });
      }

      if (typeof goalValue === 'number' && goalValue > maxValue) {
        warnings.push({
          uniqueId: GAUGE_GOAL_GT_MAX,
          severity: 'warning',
          fixableInEditor: true,
          displayLocations: [{ id: 'toolbar' }],
          shortMessage: '',
          longMessage: (
            <FormattedMessage
              id="xpack.lens.gaugeVisualization.goalValueGreaterMaximumShortMessage"
              defaultMessage="Goal value is greater than maximum value."
            />
          ),
        });
      }
    }

    return warnings;
  },

  getSuggestionFromConvertToLensContext({ suggestions, context }) {
    const allSuggestions = suggestions as Array<
      Suggestion<GaugeVisualizationState, FormBasedPersistedState>
    >;
    const suggestion: Suggestion<GaugeVisualizationState, FormBasedPersistedState> = {
      ...allSuggestions[0],
      datasourceState: {
        ...allSuggestions[0].datasourceState,
        layers: allSuggestions.reduce(
          (acc, s) => ({
            ...acc,
            ...s.datasourceState?.layers,
          }),
          {}
        ),
      },
      visualizationState: {
        ...allSuggestions[0].visualizationState,
        ...(context.configuration as GaugeVisualizationState),
      },
    };
    return suggestion;
  },

  getVisualizationInfo(state, frame) {
    const { palette, accessors } = getConfigurationAccessorsAndPalette(
      state,
      paletteService,
      frame?.activeData
    );
    const dimensions = [];
    if (accessors?.metric) {
      dimensions.push({
        id: accessors.metric,
        name: i18n.translate('xpack.lens.gauge.metricLabel', {
          defaultMessage: 'Metric',
        }),
        dimensionType: 'metric',
      });
    }

    if (accessors?.max) {
      dimensions.push({
        id: accessors.max,
        name: i18n.translate('xpack.lens.gauge.maxValueLabel', {
          defaultMessage: 'Maximum value',
        }),
        dimensionType: 'max',
      });
    }

    if (accessors?.min) {
      dimensions.push({
        id: accessors.min,
        name: i18n.translate('xpack.lens.gauge.minValueLabel', {
          defaultMessage: 'Minimum value',
        }),
        dimensionType: 'min',
      });
    }

    if (accessors?.goal) {
      dimensions.push({
        id: accessors.goal,
        name: i18n.translate('xpack.lens.gauge.goalValueLabel', {
          defaultMessage: 'Goal value',
        }),
        dimensionType: 'goal',
      });
    }
    return {
      layers: [
        {
          layerId: state.layerId,
          layerType: state.layerType,
          chartType: state.shape,
          ...this.getDescription(state),
          dimensions,
          palette,
        },
      ],
    };
  },
});

// When the active data comes from the embeddable side it might not have been indexed by layerId
// rather using a "default" key
function getActiveDataForLayer(
  layerId: string | undefined,
  activeData: FramePublicAPI['activeData'] | undefined
) {
  if (activeData && layerId) {
    return activeData[layerId] || activeData.default;
  }
}

function getConfigurationAccessorsAndPalette(
  state: GaugeVisualizationState,
  paletteService: PaletteRegistry,
  activeData?: FramePublicAPI['activeData']
) {
  const hasColoring = Boolean(state.colorMode !== 'none' && state.palette?.params?.stops);

  const row = getActiveDataForLayer(state?.layerId, activeData)?.rows?.[0];
  const { metricAccessor } = state ?? {};

  const accessors = getAccessorsFromState(state);

  let palette;
  if (row != null && metricAccessor != null && state?.palette != null && hasColoring) {
    const currentMinMax = {
      min: getMinValue(row, accessors),
      max: getMaxValue(row, accessors),
    };
    const displayStops = applyPaletteParams(paletteService, state?.palette, currentMinMax);
    palette = displayStops.map(({ color }) => color);
  }
  return { metricAccessor, accessors, palette };
}
