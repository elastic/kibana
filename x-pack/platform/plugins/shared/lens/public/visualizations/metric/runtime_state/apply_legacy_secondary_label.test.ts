/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasourceStates, MetricVisualizationState } from '@kbn/lens-common';
import {
  applyLegacySecondaryLabelIfMetric,
  applyLegacySecondaryLabelToColumn,
} from './apply_legacy_secondary_label';

const visualizationState: MetricVisualizationState = {
  layerId: 'layer-1',
  layerType: 'data',
  metricAccessor: 'primary-id',
  secondaryMetricAccessor: 'secondary-id',
  secondaryLabel: 'Custom Name (label)',
};

const formBasedDatasourceStates = (column: {
  label: string;
  customLabel?: boolean;
}): DatasourceStates => ({
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
              ...column,
            },
          },
        },
      },
    },
  },
});

const textBasedDatasourceStates = (column: {
  label?: string;
  customLabel?: boolean;
}): DatasourceStates => ({
  textBased: {
    isLoading: false,
    state: {
      layers: {
        'layer-1': {
          columns: [
            {
              columnId: 'secondary-id',
              fieldName: 'max_bytes',
              ...column,
            },
          ],
        },
      },
    },
  },
});

describe('applyLegacySecondaryLabelToColumn', () => {
  it('overwrites an existing form-based custom Name with the vis label and drops the vis field', () => {
    const result = applyLegacySecondaryLabelToColumn(
      visualizationState,
      formBasedDatasourceStates({ label: 'Custom Name', customLabel: true })
    );

    expect(result.visualizationState).not.toHaveProperty('secondaryLabel');
    expect(
      (
        result.datasourceStates.formBased.state as {
          layers: Record<
            string,
            { columns: Record<string, { label: string; customLabel: boolean }> }
          >;
        }
      ).layers['layer-1'].columns['secondary-id']
    ).toEqual(
      expect.objectContaining({
        label: 'Custom Name (label)',
        customLabel: true,
      })
    );
  });

  it('overwrites an existing text-based custom Name with the vis label and drops the vis field', () => {
    const result = applyLegacySecondaryLabelToColumn(
      visualizationState,
      textBasedDatasourceStates({ label: 'Custom Name', customLabel: true })
    );

    expect(result.visualizationState).not.toHaveProperty('secondaryLabel');
    expect(
      (
        result.datasourceStates.textBased.state as {
          layers: Record<string, { columns: Array<{ label?: string; customLabel?: boolean }> }>;
        }
      ).layers['layer-1'].columns[0]
    ).toEqual(
      expect.objectContaining({
        label: 'Custom Name (label)',
        customLabel: true,
      })
    );
  });

  it('does not copy an empty vis label onto the column', () => {
    const datasourceStates = formBasedDatasourceStates({
      label: 'Custom Name',
      customLabel: true,
    });

    expect(
      applyLegacySecondaryLabelToColumn(
        { ...visualizationState, secondaryLabel: '' },
        datasourceStates
      )
    ).toEqual({
      visualizationState: { ...visualizationState, secondaryLabel: '' },
      datasourceStates,
    });
  });

  it('keeps the vis label when the secondary column cannot be found', () => {
    const datasourceStates: DatasourceStates = {
      formBased: {
        isLoading: false,
        state: {
          currentIndexPatternId: 'index-1',
          layers: {
            'layer-1': {
              indexPatternId: 'index-1',
              columnOrder: [],
              columns: {},
            },
          },
        },
      },
    };

    expect(applyLegacySecondaryLabelToColumn(visualizationState, datasourceStates)).toEqual({
      visualizationState,
      datasourceStates,
    });
  });
});

describe('applyLegacySecondaryLabelIfMetric', () => {
  it('is a no-op for non-metric visualizations', () => {
    const datasourceStates = formBasedDatasourceStates({
      label: 'Custom Name',
      customLabel: true,
    });

    expect(
      applyLegacySecondaryLabelIfMetric('lnsXY', visualizationState, datasourceStates)
    ).toEqual({
      visualizationState,
      datasourceStates,
    });
  });
});
