/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PointInTimeEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import type { IndexPattern, IndexPatternMap } from '@kbn/lens-common';
import { convertQueryAnnotationsToEsql } from './convert_annotations_to_esql';

const indexPatterns = {
  logs: { id: 'logs', title: 'logs-*', timeFieldName: '@timestamp' } as IndexPattern,
} as IndexPatternMap;

const manualAnnotation: PointInTimeEventAnnotationConfig = {
  id: 'manual',
  type: 'manual',
  key: { type: 'point_in_time', timestamp: '2026-01-01T00:00:00Z' },
  label: 'Release',
};

const queryAnnotation: QueryPointEventAnnotationConfig = {
  id: 'deployments',
  type: 'query',
  filter: { type: 'kibana_query', query: 'event.action: "deploy"', language: 'kuery' },
  timeField: 'event.created',
  textField: 'service.version',
  textVisibility: true,
  extraFields: ['service.name', 'service.version'],
  key: { type: 'point_in_time' },
  label: 'Deployments',
  color: '#E7664C',
  icon: 'flag',
  lineStyle: 'dashed',
  lineWidth: 2,
  isHidden: false,
};

const annotationLayer = (annotations: unknown[], overrides = {}) => ({
  layerId: 'annotations',
  layerType: 'annotations',
  indexPatternId: 'logs',
  ignoreGlobalFilters: true,
  annotations,
  ...overrides,
});

describe('convertQueryAnnotationsToEsql', () => {
  it('converts query annotations and keeps other layers and manual annotations unchanged', () => {
    const dataLayer = { layerId: 'data', layerType: 'data' };
    const state = {
      legend: {},
      layers: [dataLayer, annotationLayer([manualAnnotation, queryAnnotation])],
    };

    expect(convertQueryAnnotationsToEsql(state, indexPatterns)).toEqual({
      legend: {},
      layers: [
        dataLayer,
        annotationLayer([
          manualAnnotation,
          {
            id: 'deployments',
            type: 'esql',
            key: { type: 'point_in_time' },
            query: {
              esql: 'FROM logs-* | WHERE KQL("""event.action: "deploy"""") | KEEP `event.created`, `service.version`, `service.name`',
            },
            timeField: 'event.created',
            timeColumn: 'event.created',
            textColumn: 'service.version',
            extraColumns: ['service.name', 'service.version'],
            label: 'Deployments',
            color: '#E7664C',
            icon: 'flag',
            lineStyle: 'dashed',
            lineWidth: 2,
            textVisibility: true,
            isHidden: false,
          },
        ]),
      ],
    });
  });

  it('uses Lucene, the data view time field, and no WHERE clause for empty queries', () => {
    const convert = (filter: QueryPointEventAnnotationConfig['filter']) => {
      const state = convertQueryAnnotationsToEsql(
        {
          layers: [
            annotationLayer([
              { ...queryAnnotation, filter, timeField: undefined, textVisibility: false },
            ]),
          ],
        },
        indexPatterns
      ) as {
        layers: Array<{ annotations: Array<{ query: { esql: string }; textColumn?: string }> }>;
      };
      return state.layers[0].annotations[0];
    };

    expect(
      convert({ type: 'kibana_query', query: 'status:500', language: 'lucene' }).query.esql
    ).toBe(
      'FROM logs-* | WHERE QSTR("""status:500""") | KEEP `@timestamp`, `service.name`, `service.version`'
    );
    const unfiltered = convert({ type: 'kibana_query', query: '', language: 'kuery' });
    expect(unfiltered.query.esql).toBe(
      'FROM logs-* | KEEP `@timestamp`, `service.name`, `service.version`'
    );
    expect(unfiltered.textColumn).toBeUndefined();
  });

  it.each([
    [
      'global filters apply to the layer',
      annotationLayer([queryAnnotation], { ignoreGlobalFilters: false }),
    ],
    [
      'its data view is not loaded',
      annotationLayer([queryAnnotation], { indexPatternId: 'missing' }),
    ],
    [
      'no time field can be resolved',
      annotationLayer([{ ...queryAnnotation, timeField: undefined }], { indexPatternId: 'noTime' }),
    ],
  ])('rejects a layer when %s', (_, layer) => {
    const patterns = {
      ...indexPatterns,
      noTime: { id: 'noTime', title: 'no-time' } as IndexPattern,
    };
    expect(convertQueryAnnotationsToEsql({ layers: [layer] }, patterns)).toBeUndefined();
  });

  it('converts query annotations whose filter has not been set yet', () => {
    const { filter, ...withoutFilter } = queryAnnotation;
    const state = convertQueryAnnotationsToEsql(
      { layers: [annotationLayer([withoutFilter])] },
      indexPatterns
    ) as { layers: Array<{ annotations: Array<{ query: { esql: string } }> }> };
    expect(state.layers[0].annotations[0].query.esql).toBe(
      'FROM logs-* | KEEP `event.created`, `service.version`, `service.name`'
    );
  });

  it('accepts manual-only layers that apply global filters', () => {
    const state = { layers: [annotationLayer([manualAnnotation], { ignoreGlobalFilters: false })] };
    expect(convertQueryAnnotationsToEsql(state, indexPatterns)).toEqual(state);
  });
});
