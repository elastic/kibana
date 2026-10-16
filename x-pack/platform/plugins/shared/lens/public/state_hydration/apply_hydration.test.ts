/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates } from '@kbn/lens-common';
import { LENS_METRIC_ID } from '@kbn/lens-common';
import { applyStateHydration } from './apply_hydration';

const visualizationState = {
  layerId: 'layer-1',
  layerType: 'data' as const,
  metricAccessor: 'primary-id',
  secondaryMetricAccessor: 'secondary-id',
  secondaryLabel: 'Custom Name (label)',
};

const formBasedDatasourceStates = (): DatasourceStates => ({
  formBased: {
    isLoading: false,
    state: {
      currentIndexPatternId: 'index-1',
      layers: {
        'layer-1': {
          indexPatternId: 'index-1',
          columnOrder: ['secondary-id'],
          columns: {
            'secondary-id': {
              operationType: 'max',
              sourceField: 'bytes',
              dataType: 'number',
              isBucketed: false,
              label: 'Custom Name',
              customLabel: true,
            },
          },
        },
      },
    },
  },
});

const secondaryColumnLabel = (datasourceStates: DatasourceStates) =>
  (
    datasourceStates.formBased.state as {
      layers: Record<string, { columns: Record<string, { label: string }> }>;
    }
  ).layers['layer-1'].columns['secondary-id'].label;

describe('applyStateHydration', () => {
  it('returns the original state for an unknown visualization id', () => {
    const datasourceStates = formBasedDatasourceStates();
    expect(
      applyStateHydration({
        visualizationId: 'lnsXY',
        visualizationState,
        datasourceStates,
        context: 'editor',
      })
    ).toEqual({ visualizationState, datasourceStates });
  });

  it('returns the original state when the visualization id is missing', () => {
    const datasourceStates = formBasedDatasourceStates();
    expect(
      applyStateHydration({
        visualizationId: undefined,
        visualizationState,
        datasourceStates,
        context: 'editor',
      })
    ).toEqual({ visualizationState, datasourceStates });
  });

  it('returns the original state when metric state fails the type guard', () => {
    const datasourceStates = formBasedDatasourceStates();
    const invalidVisualizationState = { notAMetric: true };

    expect(
      applyStateHydration({
        visualizationId: LENS_METRIC_ID,
        visualizationState: invalidVisualizationState,
        datasourceStates,
        context: 'editor',
      })
    ).toEqual({ visualizationState: invalidVisualizationState, datasourceStates });
  });

  it('runs the editor sequence, including the secondary-label migration', () => {
    const result = applyStateHydration({
      visualizationId: LENS_METRIC_ID,
      visualizationState,
      datasourceStates: formBasedDatasourceStates(),
      context: 'editor',
    });

    expect(result.visualizationState).not.toHaveProperty('secondaryLabel');
    expect(secondaryColumnLabel(result.datasourceStates)).toBe('Custom Name (label)');
  });

  it('skips the secondary-label migration on the expression path', () => {
    const datasourceStates = formBasedDatasourceStates();
    const result = applyStateHydration({
      visualizationId: LENS_METRIC_ID,
      visualizationState,
      datasourceStates,
      context: 'expression',
    });

    expect(result.visualizationState).toEqual(visualizationState);
    expect(secondaryColumnLabel(result.datasourceStates)).toBe('Custom Name');
  });
});
