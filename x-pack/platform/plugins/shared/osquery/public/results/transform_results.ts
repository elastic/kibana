/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils';
import type { ECSMapping } from '@kbn/osquery-io-ts-types';
import type { ResultEdges } from '../../common/search_strategy';

import { flattenOsqueryHit } from '../../common/utils/flatten_osquery_hit';

// Re-export from common for backward compatibility
export { flattenOsqueryHit, getNestedOrFlat } from '../../common/utils/flatten_osquery_hit';

interface TransformEdgesToRecordsOptions {
  edges: ResultEdges;
  ecsMapping?: ECSMapping;
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
