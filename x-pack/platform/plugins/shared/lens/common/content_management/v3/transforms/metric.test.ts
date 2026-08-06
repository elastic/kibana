/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ITEM_VERSION_V2 } from '@kbn/lens-common/content_management/constants';
import { transformToV3LensItemAttributes } from './transforms';
import type { LensAttributesV2 } from '../../v2';

const LAYER_ID = 'layer-1';
const PRIMARY_ACCESSOR = 'primary-id';
const SECONDARY_ACCESSOR = 'secondary-id';

const baseFormBasedColumn = {
  label: 'Maximum of bytes',
  dataType: 'number' as const,
  operationType: 'max',
  sourceField: 'bytes',
  isBucketed: false,
};

function buildV2MetricAttributes({
  visualizationOverrides = {},
}: {
  visualizationOverrides?: Record<string, unknown>;
} = {}): LensAttributesV2 {
  return {
    title: 'metric',
    visualizationType: 'lnsMetric',
    version: LENS_ITEM_VERSION_V2,
    references: [],
    state: {
      visualization: {
        layerId: LAYER_ID,
        layerType: 'data',
        metricAccessor: PRIMARY_ACCESSOR,
        secondaryMetricAccessor: SECONDARY_ACCESSOR,
        ...visualizationOverrides,
      },
      datasourceStates: {
        formBased: {
          layers: {
            [LAYER_ID]: {
              columnOrder: [PRIMARY_ACCESSOR, SECONDARY_ACCESSOR],
              columns: {
                [PRIMARY_ACCESSOR]: {
                  label: 'Median of bytes',
                  dataType: 'number',
                  operationType: 'median',
                  sourceField: 'bytes',
                  isBucketed: false,
                },
                [SECONDARY_ACCESSOR]: baseFormBasedColumn,
              },
            },
          },
        },
      },
      query: { query: '', language: 'kuery' },
      filters: [],
    },
  } as LensAttributesV2;
}

describe('transformToV3LensItemAttributes', () => {
  it('migrates a persisted v2 metric with secondaryLabel onto the secondary column', () => {
    const result = transformToV3LensItemAttributes(
      buildV2MetricAttributes({
        visualizationOverrides: { secondaryLabel: 'Custom Name (label)' },
      })
    );

    const secondaryColumn =
      result.state?.datasourceStates?.formBased?.layers?.[LAYER_ID]?.columns?.[SECONDARY_ACCESSOR];

    expect(result.version).toBe(3);
    expect(secondaryColumn).toEqual(
      expect.objectContaining({
        label: 'Custom Name (label)',
        customLabel: true,
      })
    );
    expect(result.state?.visualization).not.toHaveProperty('secondaryLabel');
    expect(result.state?.visualization).toEqual(
      expect.objectContaining({ secondaryNameVisibility: 'before' })
    );
  });

  it('preserves an explicit secondaryLabelPosition as secondaryNameVisibility', () => {
    const result = transformToV3LensItemAttributes(
      buildV2MetricAttributes({
        visualizationOverrides: {
          secondaryLabel: 'Custom Name (label)',
          secondaryLabelPosition: 'after',
        },
      })
    );

    expect(result.version).toBe(3);
    expect(result.state?.visualization).toEqual(
      expect.objectContaining({ secondaryNameVisibility: 'after' })
    );
    expect(result.state?.visualization).not.toHaveProperty('secondaryLabelPosition');
  });

  it('is idempotent for already-migrated v3 attributes', () => {
    const once = transformToV3LensItemAttributes(
      buildV2MetricAttributes({
        visualizationOverrides: { secondaryLabel: 'Custom Name (label)' },
      })
    );
    const twice = transformToV3LensItemAttributes(once);

    expect(twice).toEqual(once);
  });
});
