/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { TruncatedDocumentAnalysis } from '@kbn/ai-tools';
import { mergeSampleDocumentsWithFieldCaps, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import { getFlattenedObject } from '@kbn/std';
import { dbscan } from './dbscan';

// dbscan parameters
const EPSILON = 0.3;
const MIN_POINTS = 5;
// how much extra weight to give shared keyword values vs schema
const SCHEMA_WEIGHT = 0.8;
const VALUE_WEIGHT = 0.2;

/**
 * Compute pure Jaccard distance on two sorted int-lists, by
 * counting the matching fields
 */
function jaccardDistance(a: number[], b: number[]): number {
  let i = 0;
  let j = 0;
  let inter = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      inter++;
      i++;
      j++;
    } else if (a[i] < b[j]) i++;
    else j++;
  }
  const union = a.length + b.length - inter;
  return union > 0 ? 1 - inter / union : 0;
}

interface ClusterDocsResponse {
  sampled: number;
  noise: number[];
  clusters: Array<{
    count: number;
    samples: SearchHit[];
    analysis: TruncatedDocumentAnalysis;
  }>;
}

interface DocPoint {
  id: string;
  fieldIds: number[];
  kvPairs: string[]; // e.g. "service.name:auth"
}

export function clusterSampleDocs({
  hits,
  fieldCaps,
  dropUnmapped = false,
}: {
  hits: SearchHit[];
  fieldCaps: FieldCapsResponse;
  dropUnmapped?: boolean;
}): ClusterDocsResponse {
  if (hits.length === 0) {
    return { sampled: 0, noise: [], clusters: [] };
  }

  // 2) First pass: build maps for schema IDs and string-value cardinality
  const fieldToId = new Map<string, number>();

  const valueCount = new Map<string, Set<string>>(); // field → distinct string values

  const docs: DocPoint[] = [];

  for (const hit of hits) {
    // flatten object into key-value pairs so it can be converted into integers
    const src = getFlattenedObject({
      ...(hit.fields ?? {}),
      ...(hit._source ?? {}),
    });

    const fields = Object.keys(src);

    const ids: number[] = [];

    const keyValuePairs: string[] = [];

    for (const field of fields) {
      let fieldId = fieldToId.get(field);
      // for each unseen field, get the next available int
      if (fieldId === undefined) {
        fieldId = fieldToId.size;
        fieldToId.set(field, fieldId);
      }

      ids.push(fieldId);

      const value = src[field];
      if (typeof value === 'string') {
        // record this field:value occurrence
        keyValuePairs.push(`${field}:${value}`);

        // record unique values per field
        if (!valueCount.has(field)) {
          valueCount.set(field, new Set());
        }

        valueCount.get(field)!.add(value);
      }
    }

    ids.sort((a, b) => a - b);

    docs.push({ id: hit._id as string, fieldIds: ids, kvPairs: keyValuePairs });
  }

  // calculate cardinality per field
  const fieldWeight = new Map<string, number>();
  for (const [f, valSet] of valueCount) {
    const card = valSet.size;
    // high cardinality fields get less weight
    fieldWeight.set(f, 1 / Math.log(card + 1));
  }

  // calculate schema and key-value distances
  function hybridDistance(a: DocPoint, b: DocPoint): number {
    // schema part
    const schemaDistance = jaccardDistance(a.fieldIds, b.fieldIds);

    // weighted-Jaccard on kvPairs
    const sa = new Set(a.kvPairs);
    const sb = new Set(b.kvPairs);

    const union = new Set<string>([...sa, ...sb]);

    let interWeight = 0;
    let totalWeight = 0;
    for (const kv of union) {
      const [f] = kv.split(':');
      const w = fieldWeight.get(f) ?? 0;
      totalWeight += w;
      if (sa.has(kv) && sb.has(kv)) {
        interWeight += w;
      }
    }
    const dValues = totalWeight > 0 ? 1 - interWeight / totalWeight : 1;

    return SCHEMA_WEIGHT * schemaDistance + VALUE_WEIGHT * dValues;
  }

  const { clusters, noise } = dbscan(docs, EPSILON, MIN_POINTS, hybridDistance);

  return {
    sampled: hits.length,
    noise,
    clusters: clusters.map((cluster) => {
      const samples = cluster.map((i) => hits[i]);
      return {
        count: cluster.length,
        samples,
        analysis: sortAndTruncateAnalyzedFields(
          mergeSampleDocumentsWithFieldCaps({
            total: samples.length,
            hits: samples,
            fieldCaps,
          }),
          { dropEmpty: true, dropUnmapped }
        ),
      };
    }),
  };
}
