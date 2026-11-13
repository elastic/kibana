/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { corpusObjects } from '../../../corpus.test_helpers';
import { renderedLabel } from './lens_labels';

describe('renderedLabel', () => {
  const columns = {
    terms: {
      operationType: 'terms',
      sourceField: 'OriginCityName',
      label: 'Top values of OriginCityName',
      params: { size: 1000 },
    },
    count: { operationType: 'count', sourceField: '___records___', label: 'Flights' },
    named: {
      operationType: 'count',
      sourceField: '___records___',
      label: 'Flights',
      customLabel: true,
    },
    avg: { operationType: 'average', sourceField: 'bytes', label: 'x' },
    diff: { operationType: 'differences', references: ['avg'], label: 'x' },
    shifted: { operationType: 'last_value', sourceField: 'bytes', timeShift: '1w', label: 'x' },
  };

  it('names each column as Lens renders it, keeping custom labels', () => {
    const label = (id: keyof typeof columns, fieldLabels?: Record<string, string>) =>
      renderedLabel(columns[id], columns, fieldLabels);
    expect(label('terms')).toBe('Top 1000 values of OriginCityName');
    expect(label('terms', { OriginCityName: 'Origin' })).toBe('Top 1000 values of Origin');
    expect(label('count')).toBe('Count of records');
    expect(label('named')).toBe('Flights');
    expect(label('avg')).toBe('Average of bytes');
    expect(label('diff')).toBe('Differences of Average of bytes');
    expect(label('shifted')).toBe('Last value of bytes -1w');
  });

  // Every form-based operation in the repository's saved Lens objects gets Lens's label; a new one fails here.
  it('labels every operation in the corpus', () => {
    const operations = new Set<string>();
    const unlabelled = new Set<string>();
    for (const { attributes } of corpusObjects(['lens'], 'formBased')) {
      const layers =
        (
          attributes.state as {
            datasourceStates?: {
              formBased?: { layers?: Record<string, { columns?: Record<string, never> }> };
            };
          }
        )?.datasourceStates?.formBased?.layers ?? {};
      for (const { columns: layerColumns = {} } of Object.values(layers)) {
        for (const column of Object.values(layerColumns) as Array<{ operationType: string }>) {
          operations.add(column.operationType);
          if (renderedLabel(column, layerColumns) === undefined)
            unlabelled.add(column.operationType);
        }
      }
    }
    expect(operations.size).toBeGreaterThan(5);
    expect([...unlabelled]).toEqual([]);
  });
});
