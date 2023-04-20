/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MsearchRequestItem } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import { EcsFlat } from '@kbn/ecs';
import {
  getMSearchRequestBody,
  getMSearchRequestHeader,
} from './helpers/get_unallowed_field_requests';

export interface UnallowedValueRequestItem {
  allowedValues: string[];
  indexFieldName: string;
  indexName: string;
}

export interface AllowedValue {
  description?: string;
  expected_event_types?: string[];
  name?: string;
}

export interface EcsMetadata {
  allowed_values?: AllowedValue[];
  dashed_name?: string;
  description?: string;
  example?: string;
  flat_name?: string;
  format?: string;
  ignore_above?: number;
  level?: string;
  name?: string;
  normalize?: string[];
  required?: boolean;
  short?: string;
  type?: string;
}

export const hasAllowedValues = ({
  ecsMetadata,
  fieldName,
}: {
  ecsMetadata: Record<string, EcsMetadata> | null;
  fieldName: string;
}): boolean =>
  ecsMetadata != null ? (ecsMetadata[fieldName]?.allowed_values?.length ?? 0) > 0 : false;

export const getValidValues = (field: EcsMetadata | undefined): string[] =>
  field?.allowed_values?.flatMap(({ name }) => (name != null ? name : [])) ?? [];

export const getUnallowedValueRequestItems = ({
  ecsMetadata,
  indexName,
}: {
  ecsMetadata: Record<string, EcsMetadata> | null;
  indexName: string;
}): UnallowedValueRequestItem[] =>
  ecsMetadata != null
    ? Object.keys(ecsMetadata).reduce<UnallowedValueRequestItem[]>(
        (acc, fieldName) =>
          hasAllowedValues({ ecsMetadata, fieldName })
            ? [
                ...acc,
                {
                  indexName,
                  indexFieldName: fieldName,
                  allowedValues: getValidValues(ecsMetadata[fieldName]),
                },
              ]
            : acc,
        []
      )
    : [];

export const getUnallowedFieldValues = (esClient: ElasticsearchClient, indices: string[]) => {
  const items: UnallowedValueRequestItem[] = indices.flatMap((indexName) =>
    getUnallowedValueRequestItems({
      indexName,
      ecsMetadata: EcsFlat as unknown as Record<string, EcsMetadata>,
    })
  );

  const searches: MsearchRequestItem[] = items.reduce<MsearchRequestItem[]>(
    (acc, { indexName, indexFieldName, allowedValues }) =>
      acc.concat([
        getMSearchRequestHeader(indexName),
        getMSearchRequestBody({ indexFieldName, allowedValues }),
      ]),
    []
  );

  return esClient.msearch({
    searches,
  });
};
