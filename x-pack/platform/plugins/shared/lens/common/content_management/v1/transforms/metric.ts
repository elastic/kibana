/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MetricVisualizationState, StructuredDatasourceStates } from '@kbn/lens-common';
import type { LensAttributes } from '../../../../server/content_management/v1';

/**
 * Pre-rename shape of `secondaryNameVisibility`. Real saved objects created between
 * `#261247` (which introduced this field as `'before' | 'after'`) and the rename to
 * `secondaryNameVisibility` still persist it under this legacy key.
 * @deprecated
 */
interface LegacyMetricVisualizationState {
  secondaryLabelPosition?: MetricVisualizationState['secondaryNameVisibility'];
}

interface MetricAttributesState {
  visualization: MetricVisualizationState & LegacyMetricVisualizationState;
  datasourceStates?: StructuredDatasourceStates;
}

/**
 * Apply a legacy visualization-level custom secondary label onto the secondary metric
 * column so it becomes the operation name that rendering reads.
 * Visualization `secondaryLabel` previously took priority over the column name.
 */
function applyCustomLabelToSecondaryMetricColumn(
  datasourceStates: StructuredDatasourceStates,
  layerId: string,
  secondaryMetricAccessor: string,
  customLabel: string
): StructuredDatasourceStates {
  const formBasedLayer = datasourceStates.formBased?.layers?.[layerId];
  const formBasedColumn = formBasedLayer?.columns?.[secondaryMetricAccessor];
  if (formBasedLayer && formBasedColumn) {
    return {
      ...datasourceStates,
      formBased: {
        ...datasourceStates.formBased!,
        layers: {
          ...datasourceStates.formBased!.layers,
          [layerId]: {
            ...formBasedLayer,
            columns: {
              ...formBasedLayer.columns,
              [secondaryMetricAccessor]: {
                ...formBasedColumn,
                label: customLabel,
                customLabel: true,
              },
            },
          },
        },
      },
    };
  }

  const textBasedLayer = datasourceStates.textBased?.layers?.[layerId];
  if (textBasedLayer?.columns?.some((column) => column.columnId === secondaryMetricAccessor)) {
    return {
      ...datasourceStates,
      textBased: {
        ...datasourceStates.textBased!,
        layers: {
          ...datasourceStates.textBased!.layers,
          [layerId]: {
            ...textBasedLayer,
            columns: textBasedLayer.columns.map((column) =>
              column.columnId === secondaryMetricAccessor
                ? { ...column, label: customLabel, customLabel: true }
                : column
            ),
          },
        },
      },
    };
  }

  return datasourceStates;
}

/**
 * Cleanup metric properties
 * - Move `valuesTextAlign` to `primaryAlign` and `secondaryAlign`
 * - Drop `secondaryPrefix`/`secondaryLabel` in favour of the secondary metric operation name,
 *   preserving their visibility in `secondaryNameVisibility` and copying a non-empty custom
 *   label onto the secondary metric column (custom label wins over the default operation name)
 * - Rename `secondaryLabelPosition` to `secondaryNameVisibility`
 */
export function metricMigrations(attributes: LensAttributes): LensAttributes {
  if (!attributes.state || attributes.visualizationType !== 'lnsMetric') {
    return attributes;
  }

  const state = attributes.state as MetricAttributesState;
  const { secondaryLabel, secondaryPrefix } = state.visualization;
  const legacyLabel = secondaryLabel ?? secondaryPrefix;
  const newVisualizationState = getUpdatedMetricState(state.visualization);
  const {
    secondaryLabel: _,
    secondaryPrefix: __,
    ...cleanVisualizationState
  } = newVisualizationState;

  const shouldApplyCustomLabel =
    Boolean(legacyLabel) &&
    Boolean(newVisualizationState.secondaryMetricAccessor) &&
    Boolean(state.datasourceStates);

  return {
    ...attributes,
    state: {
      ...state,
      visualization: cleanVisualizationState,
      ...(shouldApplyCustomLabel
        ? {
            datasourceStates: applyCustomLabelToSecondaryMetricColumn(
              state.datasourceStates!,
              cleanVisualizationState.layerId,
              cleanVisualizationState.secondaryMetricAccessor!,
              legacyLabel!
            ),
          }
        : {}),
    },
  };
}

export const getUpdatedMetricState = (
  state: MetricVisualizationState
): MetricVisualizationState => {
  const legacyState = state as MetricVisualizationState & LegacyMetricVisualizationState;
  const { secondaryPrefix, secondaryLabel, secondaryLabelPosition, valuesTextAlign, ...restState } =
    legacyState;
  let newState: MetricVisualizationState = { ...restState };

  if (valuesTextAlign) {
    newState = {
      ...newState,
      primaryAlign: state.primaryAlign ?? valuesTextAlign,
      secondaryAlign: state.secondaryAlign ?? valuesTextAlign,
    };
  }

  if (newState.secondaryMetricAccessor) {
    // The legacy label had 3 modes: `undefined` (the operation name), `''` (no label) and any
    // other string (a custom label overriding the operation name). Visibility is preserved here;
    // a non-empty custom label is copied onto the secondary metric column by `metricMigrations`.
    // For raw by-value dashboard state that only runs the runtime converter, keep the custom
    // label as a legacy fallback until render time.
    const legacyLabel = secondaryLabel ?? secondaryPrefix;
    newState = {
      ...newState,
      ...(legacyLabel ? { secondaryLabel: legacyLabel } : {}),
      secondaryNameVisibility:
        legacyLabel === ''
          ? 'hidden'
          : // A state without an explicit position predates `Name display`, where the label
            // was shown before the value by default. Newer states always set it explicitly.
            // `secondaryLabelPosition` is the pre-rename key: real saved objects created after
            // `#261247` but before the rename persist their explicit choice there.
            newState.secondaryNameVisibility ?? secondaryLabelPosition ?? 'before',
    };
  }

  return newState;
};
