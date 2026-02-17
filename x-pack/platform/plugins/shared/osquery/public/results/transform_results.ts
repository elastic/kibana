/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-plugin/common';
import { isArray, isObject } from 'lodash/fp';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { ResultEdges } from '../../common/search_strategy';

interface TransformEdgesToRecordsOptions {
  edges: ResultEdges;
  dataView?: DataView;
  ecsMapping?: ECSMapping;
}

export function flattenOsqueryHit(
  edge: ResultEdges[number],
  ecsMapping?: ECSMapping
): Record<string, unknown> {
  const flattened: Record<string, unknown> = {};

  if (edge.fields) {
    for (const [key, value] of Object.entries(edge.fields)) {
      flattened[key] = isArray(value) && value.length === 1 ? value[0] : value;
    }
  }

  if (ecsMapping && edge._source) {
    const ecsMappingKeys = Object.keys(ecsMapping);
    for (const key of ecsMappingKeys) {
      const sourceValue = (edge._source as Record<string, unknown>)?.[key];
      if (sourceValue !== undefined) {
        if (isArray(sourceValue) || isObject(sourceValue)) {
          try {
            flattened[key] = JSON.stringify(sourceValue, null, 2);
          } catch {
            flattened[key] = sourceValue;
          }
        } else {
          flattened[key] = sourceValue;
        }
      }
    }
  }

  return flattened;
}

export function transformEdgesToRecords({
  edges,
  ecsMapping,
}: TransformEdgesToRecordsOptions): DataTableRecord[] {
  return edges.map((edge, index) => ({
    id: edge._id ?? `osquery-result-${index}`,
    raw: edge as EsHitRecord,
    flattened: flattenOsqueryHit(edge, ecsMapping),
  }));
}

export function getRecordFieldValue(record: DataTableRecord, columnId: string): unknown {
  const value = record.flattened[columnId];

  if (value === undefined || value === null || value === '') {
    return '-';
  }

  return value;
}
