/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { metricMigrations } from './metric';
import type { LensAttributes } from '../../../../server/content_management/v1';

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

function buildMetricAttributes({
  visualizationOverrides = {},
  secondaryColumn = baseFormBasedColumn,
}: {
  visualizationOverrides?: Record<string, unknown>;
  secondaryColumn?: Record<string, unknown>;
} = {}): LensAttributes {
  return {
    title: 'metric',
    visualizationType: 'lnsMetric',
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
                [SECONDARY_ACCESSOR]: secondaryColumn,
              },
            },
          },
        },
      },
      query: { query: '', language: 'kuery' },
      filters: [],
    },
  } as LensAttributes;
}

describe('metricMigrations', () => {
  it('copies a custom secondaryLabel onto the secondary metric column', () => {
    const result = metricMigrations(
      buildMetricAttributes({
        visualizationOverrides: { secondaryLabel: 'Custom Name (label)' },
      })
    );

    const secondaryColumn =
      result.state?.datasourceStates?.formBased?.layers?.[LAYER_ID]?.columns?.[SECONDARY_ACCESSOR];

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

  it('gives secondaryLabel priority over an existing column custom label', () => {
    const result = metricMigrations(
      buildMetricAttributes({
        visualizationOverrides: { secondaryLabel: 'Custom Name (label)' },
        secondaryColumn: {
          ...baseFormBasedColumn,
          label: 'Custom Name',
          customLabel: true,
        },
      })
    );

    const secondaryColumn =
      result.state?.datasourceStates?.formBased?.layers?.[LAYER_ID]?.columns?.[SECONDARY_ACCESSOR];

    expect(secondaryColumn).toEqual(
      expect.objectContaining({
        label: 'Custom Name (label)',
        customLabel: true,
      })
    );
  });

  it('does not overwrite the column when secondaryLabel was emptied (hidden)', () => {
    const result = metricMigrations(
      buildMetricAttributes({
        visualizationOverrides: { secondaryLabel: '' },
        secondaryColumn: {
          ...baseFormBasedColumn,
          label: 'Custom Name',
          customLabel: true,
        },
      })
    );

    const secondaryColumn =
      result.state?.datasourceStates?.formBased?.layers?.[LAYER_ID]?.columns?.[SECONDARY_ACCESSOR];

    expect(secondaryColumn).toEqual(
      expect.objectContaining({
        label: 'Custom Name',
        customLabel: true,
      })
    );
    expect(result.state?.visualization).toEqual(
      expect.objectContaining({ secondaryNameVisibility: 'hidden' })
    );
  });

  it('leaves the default operation name when no legacy custom label was set', () => {
    const result = metricMigrations(buildMetricAttributes());

    const secondaryColumn =
      result.state?.datasourceStates?.formBased?.layers?.[LAYER_ID]?.columns?.[SECONDARY_ACCESSOR];

    expect(secondaryColumn).toEqual(
      expect.objectContaining({
        label: 'Maximum of bytes',
      })
    );
    expect(secondaryColumn).not.toHaveProperty('customLabel');
  });

  it('copies a custom secondaryLabel onto a text-based secondary column', () => {
    const attributes = {
      title: 'metric',
      visualizationType: 'lnsMetric',
      references: [],
      state: {
        visualization: {
          layerId: LAYER_ID,
          layerType: 'data',
          metricAccessor: PRIMARY_ACCESSOR,
          secondaryMetricAccessor: SECONDARY_ACCESSOR,
          secondaryLabel: 'ES|QL custom',
        },
        datasourceStates: {
          textBased: {
            layers: {
              [LAYER_ID]: {
                columns: [
                  { columnId: PRIMARY_ACCESSOR, fieldName: 'median_bytes' },
                  { columnId: SECONDARY_ACCESSOR, fieldName: 'max_bytes' },
                ],
              },
            },
          },
        },
        query: { query: '', language: 'kuery' },
        filters: [],
      },
    } as LensAttributes;

    const result = metricMigrations(attributes);
    const secondaryColumn = result.state?.datasourceStates?.textBased?.layers?.[
      LAYER_ID
    ]?.columns?.find((column: { columnId: string }) => column.columnId === SECONDARY_ACCESSOR);

    expect(secondaryColumn).toEqual(
      expect.objectContaining({
        label: 'ES|QL custom',
        customLabel: true,
      })
    );
  });
});
