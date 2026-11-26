/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ELASTIC_HTTP_VERSION_HEADER,
  X_ELASTIC_INTERNAL_ORIGIN_REQUEST,
} from '@kbn/core-http-common';
import { ESQL_SEARCH_STRATEGY } from '@kbn/data-plugin/common';
import { SEARCH_API_BASE_URL } from '@kbn/data-plugin/server/search/routes';
import type {
  EsqlEventAnnotationConfig,
  QueryPointEventAnnotationConfig,
} from '@kbn/event-annotation-common';
import {
  convertQueryAnnotationsToEsql,
  type IndexPattern,
  type IndexPatternMap,
} from '@kbn/lens-common';
import {
  ANNOTATION_CONVERSION_TIME_FIELD,
  buildAnnotationConversionCases,
  type AnnotationConversionInput,
} from '@kbn/lens-test-helpers';
import { tags } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { ES_ARCHIVE_PATHS } from '../../../common/fixtures/constants';
import { apiTest } from '../fixtures';

const INTERNAL_HEADERS = {
  'kbn-xsrf': 'scout',
  [X_ELASTIC_INTERNAL_ORIGIN_REQUEST]: 'kibana',
  [ELASTIC_HTTP_VERSION_HEADER]: '1',
} as const;

// Only the members the converter reads. The logstash archive has no runtime or scripted
// fields, so the stub exposes none and the converter's data-view-only checks pass.
const INDEX = 'logstash-*';
const INDEX_PATTERNS = {
  logstash: {
    id: 'logstash',
    title: INDEX,
    timeFieldName: ANNOTATION_CONVERSION_TIME_FIELD,
    fields: [],
    getFieldByName: () => undefined,
  } as unknown as IndexPattern,
} as IndexPatternMap;

const toQueryAnnotation = ({
  filter,
  extraFields,
  ...rest
}: AnnotationConversionInput): QueryPointEventAnnotationConfig => ({
  id: 'annotation',
  type: 'query',
  key: { type: 'point_in_time' },
  label: 'Annotation',
  ...rest,
  filter: { type: 'kibana_query', ...(filter ?? { query: '', language: 'kuery' }) },
  ...(extraFields ? { extraFields: [...extraFields] } : {}),
});

const convertLayer = ({
  annotation,
  ignoreGlobalFilters,
}: {
  annotation: QueryPointEventAnnotationConfig;
  ignoreGlobalFilters: boolean;
}) =>
  convertQueryAnnotationsToEsql(
    {
      layers: [
        {
          layerId: 'annotations',
          layerType: 'annotations',
          indexPatternId: 'logstash',
          ignoreGlobalFilters,
          annotations: [annotation],
        },
      ],
    },
    INDEX_PATTERNS
  );

interface ConvertedState {
  layers: Array<{ ignoreGlobalFilters: boolean; annotations: EsqlEventAnnotationConfig[] }>;
}

const convertAnnotation = (annotation: QueryPointEventAnnotationConfig) => {
  const conversion = convertLayer({ annotation, ignoreGlobalFilters: true });
  if (!conversion.ok) {
    throw new Error(`Expected the annotation to be convertible, got: ${conversion.reason}`);
  }
  return (conversion.state as ConvertedState).layers[0].annotations[0];
};

apiTest.describe(
  'Lens query annotation → ES|QL annotation query execution',
  { tag: [...tags.stateful.classic] },
  () => {
    let cookieHeader: Record<string, string>;

    apiTest.beforeAll(async ({ esArchiver, samlAuth }) => {
      await esArchiver.loadIfNeeded(ES_ARCHIVE_PATHS.LOGSTASH);
      cookieHeader = (await samlAuth.asInteractiveUser('viewer')).cookieHeader;
    });

    for (const conversionCase of buildAnnotationConversionCases({ index: INDEX })) {
      apiTest(
        `executes the converted query for ${conversionCase.description}`,
        async ({ apiClient }) => {
          const converted = convertAnnotation(toQueryAnnotation(conversionCase.annotation));
          // Keep the exact query assertion close to execution so this layer verifies
          // the converter output that it sends to Elasticsearch.
          expect(converted.query.esql).toBe(conversionCase.expectedEsql);

          const response = await apiClient.post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`, {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            body: { params: { query: converted.query.esql } },
          });

          expect(response).toHaveStatusCode(200);
          const columnNames = response.body.rawResponse.columns.map(
            ({ name }: { name: string }) => name
          );
          // Result names must match the bindings the annotation renders from
          expect(columnNames).toStrictEqual([...conversionCase.expectedResultColumns]);
          expect(columnNames).toContain(converted.timeColumn);
          expect(response.body.rawResponse.values.length).toBeGreaterThan(0);
        }
      );
    }

    apiTest(
      'converts a layer that applies global filters, keeps the setting, and the converted query honors a global filter',
      async ({ apiClient }) => {
        const conversion = convertLayer({
          annotation: toQueryAnnotation({
            filter: { query: 'machine.os.raw : "osx"', language: 'kuery' },
            textVisibility: true,
            textField: 'geo.src',
          }),
          ignoreGlobalFilters: false,
        });
        if (!conversion.ok) {
          throw new Error(`Expected the layer to be convertible, got: ${conversion.reason}`);
        }
        const [layer] = (conversion.state as ConvertedState).layers;
        // ES|QL annotations apply global filters too, so the setting carries over unchanged
        expect(layer.ignoreGlobalFilters).toBe(false);

        const [converted] = layer.annotations;
        const run = async (filter?: object) => {
          const response = await apiClient.post(`${SEARCH_API_BASE_URL}/${ESQL_SEARCH_STRATEGY}`, {
            headers: { ...INTERNAL_HEADERS, ...cookieHeader },
            body: { params: { query: converted.query.esql, ...(filter ? { filter } : {}) } },
          });
          expect(response).toHaveStatusCode(200);
          const columnNames: string[] = response.body.rawResponse.columns.map(
            ({ name }: { name: string }) => name
          );
          const textIndex = columnNames.indexOf('geo.src');
          expect(textIndex).toBeGreaterThanOrEqual(0);
          return (response.body.rawResponse.values as unknown[][]).map((row) => row[textIndex]);
        };

        // The dashboard filter reaches Elasticsearch as the request `filter`
        const unfiltered = await run();
        const filtered = await run({ match_phrase: { 'geo.src': 'CN' } });

        expect(filtered.length).toBeGreaterThan(0);
        expect(filtered.length).toBeLessThan(unfiltered.length);
        expect(filtered.every((source) => source === 'CN')).toBe(true);
        expect(unfiltered.some((source) => source !== 'CN')).toBe(true);
      }
    );
  }
);
