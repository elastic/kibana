/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import { hasQueryBasedAnnotations } from './use_esql_conversion_check';

const manualAnnotation: EventAnnotationConfig = {
  id: 'manual',
  type: 'manual',
  key: { type: 'point_in_time', timestamp: '2024-01-01T00:00:00.000Z' },
  label: 'Manual',
};

const queryAnnotation: EventAnnotationConfig = {
  id: 'query',
  type: 'query',
  filter: { type: 'kibana_query', query: 'foo: bar', language: 'kuery' },
  key: { type: 'point_in_time' },
  timeField: '@timestamp',
  label: 'Query',
};

describe('hasQueryBasedAnnotations', () => {
  it('returns false for a state without layers', () => {
    expect(hasQueryBasedAnnotations(undefined)).toBe(false);
    expect(hasQueryBasedAnnotations({})).toBe(false);
    expect(hasQueryBasedAnnotations({ layers: 'not-an-array' })).toBe(false);
  });

  it('returns false for data and reference line layers', () => {
    expect(
      hasQueryBasedAnnotations({
        layers: [
          { layerId: 'a', layerType: 'data' },
          { layerId: 'b', layerType: 'referenceLine' },
        ],
      })
    ).toBe(false);
  });

  it('returns false for annotation layers with only manual annotations', () => {
    expect(
      hasQueryBasedAnnotations({
        layers: [{ layerId: 'a', layerType: 'annotations', annotations: [manualAnnotation] }],
      })
    ).toBe(false);
  });

  it('returns true when any annotation layer contains a query-based annotation', () => {
    expect(
      hasQueryBasedAnnotations({
        layers: [
          { layerId: 'a', layerType: 'data' },
          {
            layerId: 'b',
            layerType: 'annotations',
            annotations: [manualAnnotation, queryAnnotation],
          },
        ],
      })
    ).toBe(true);
  });
});
