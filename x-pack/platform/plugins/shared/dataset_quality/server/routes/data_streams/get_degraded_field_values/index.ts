/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { SearchHit } from '@kbn/es-types';
import { DegradedFieldValues } from '../../../../common/api_types';
import { createDatasetQualityESClient } from '../../../utils';
import { _IGNORED, TIMESTAMP } from '../../../../common/es_fields';

export async function getDegradedFieldValues({
  esClient,
  dataStream,
  degradedField,
}: {
  esClient: ElasticsearchClient;
  dataStream: string;
  degradedField: string;
}): Promise<DegradedFieldValues> {
  const datasetQualityESClient = createDatasetQualityESClient(esClient);

  const response = await datasetQualityESClient.search({
    index: dataStream,
    size: 4,
    fields: [degradedField],
    query: { term: { [_IGNORED]: degradedField } },
    sort: [
      {
        [TIMESTAMP]: {
          order: 'desc',
        },
      },
    ],
  });

  const values = extractAndDeduplicateValues(response.hits.hits, degradedField);

  return {
    field: degradedField,
    values,
  };
}

function extractAndDeduplicateValues(searchHits: SearchHit[], key: string): string[] {
  const values: string[] = [];

  searchHits.forEach((hit: any) => {
    const fieldValue = hit.ignored_field_values?.[key];
    if (fieldValue) {
      if (Array.isArray(fieldValue)) {
        values.push(...fieldValue);
      } else {
        values.push(fieldValue);
      }
    }
  });

  // Flatten and deduplicate the array
  const deduplicatedValues = Array.from(new Set(values.flat()));

  return deduplicatedValues;
}
