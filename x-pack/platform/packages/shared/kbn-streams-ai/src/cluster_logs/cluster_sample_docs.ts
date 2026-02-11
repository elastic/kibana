/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { FormattedDocumentAnalysis } from '@kbn/ai-tools';
import { formatDocumentAnalysis, mergeSampleDocumentsWithFieldCaps } from '@kbn/ai-tools';
import { getFlattenedObject } from '@kbn/std';
import { dbscan } from './dbscan';

// dbscan parameters
const EPSILON = 0.3;
const MIN_POINTS = 5;
// how much extra weight to give shared keyword values vs schema
const SCHEMA_WEIGHT = 0.8;
const VALUE_WEIGHT = 0.2;
const DEFAULT_VALUE_CARDINALITY_LIMIT = 100;

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
    analysis: FormattedDocumentAnalysis;
  }>;
}

interface DocPoint {
  id: string;
  fieldIds: number[];
  kvPairIds: number[];
  kvWeightSum: number;
}

export function clusterSampleDocs({
  hits,
  fieldCaps,
  dropUnmapped = false,
  valueCardinalityLimit = DEFAULT_VALUE_CARDINALITY_LIMIT,
}: {
  hits: SearchHit[];
  fieldCaps: FieldCapsResponse;
  dropUnmapped?: boolean;
  valueCardinalityLimit?: number;
}): ClusterDocsResponse {
  if (hits.length === 0) {
    return { sampled: 0, noise: [], clusters: [] };
  }

  // 2) First pass: build maps for schema IDs and string-value cardinality
  const fieldToId = new Map<string, number>();

  const valueCount = new Map<string, Set<string>>(); // field → distinct string values
  const fieldWeightById: number[] = [];
  const fieldCardinalityById: number[] = [];
  const trackValueForFieldById: boolean[] = [];

  const kvToId = new Map<string, number>();
  const kvFieldById: number[] = [];
  const kvWeightById: number[] = [];

  const docs: DocPoint[] = [];

  function traverseDocs() {
    for (const hit of hits) {
      // flatten object into key-value pairs so it can be converted into integers
      const src = getFlattenedObject({
        ...(hit.fields ?? {}),
        ...(hit._source ?? {}),
      });

      const fields = Object.keys(src);

      const ids: number[] = [];

      const kvPairIds: number[] = [];

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
          const kvKey = `${field}:${value}`;
          let kvId = kvToId.get(kvKey);
          if (kvId === undefined) {
            kvId = kvToId.size;
            kvToId.set(kvKey, kvId);
            kvFieldById[kvId] = fieldId;
          }

          kvPairIds.push(kvId);

          // record unique values per field
          if (!valueCount.has(field)) {
            valueCount.set(field, new Set());
          }

          valueCount.get(field)!.add(value);
        }
      }

      ids.sort((a, b) => a - b);

      kvPairIds.sort((a, b) => a - b);

      docs.push({ id: hit._id as string, fieldIds: ids, kvPairIds, kvWeightSum: 0 });
    }
  }

  const fieldWeight = new Map<string, number>();

  function calculateFieldWeights() {
    // calculate cardinality per field
    for (const [f, valSet] of valueCount) {
      const card = valSet.size;
      // high cardinality fields get less weight
      fieldWeight.set(f, 1 / Math.log(card + 1));
      const fieldId = fieldToId.get(f);
      if (fieldId !== undefined) {
        fieldCardinalityById[fieldId] = card;
      }
    }

    for (const [field, id] of fieldToId) {
      fieldWeightById[id] = fieldWeight.get(field) ?? 0;
    }
  }

  function determineValueTracking(limit: number) {
    const effectiveLimit = limit !== undefined && limit > 0 ? limit : Number.POSITIVE_INFINITY;
    const fieldCount = fieldToId.size;
    for (let id = 0; id < fieldCount; id++) {
      const cardinality = fieldCardinalityById[id] ?? 0;
      trackValueForFieldById[id] = cardinality <= effectiveLimit;
    }
  }

  function populateKvWeights() {
    for (let kvId = 0; kvId < kvFieldById.length; kvId++) {
      const fieldId = kvFieldById[kvId];
      kvWeightById[kvId] = trackValueForFieldById[fieldId] ? fieldWeightById[fieldId] ?? 0 : 0;
    }
  }

  function finalizeDocs() {
    for (const doc of docs) {
      // remove duplicate kv entries after sorting while computing total weight
      const dedupedKvIds: number[] = [];
      let prevKv = -1;
      let weightSum = 0;
      for (const kvId of doc.kvPairIds) {
        const weight = kvWeightById[kvId];
        if (weight === 0) {
          prevKv = -1; // reset dedupe sentinel when skipping
          continue;
        }
        if (kvId !== prevKv) {
          dedupedKvIds.push(kvId);
          weightSum += weight;
          prevKv = kvId;
        }
      }

      doc.kvPairIds = dedupedKvIds;
      doc.kvWeightSum = weightSum;
    }
  }

  // calculate schema and key-value distances
  function hybridDistance(left: DocPoint, right: DocPoint): number {
    // schema part
    const schemaDistance = jaccardDistance(left.fieldIds, right.fieldIds);

    const minPossible = SCHEMA_WEIGHT * schemaDistance;
    if (minPossible > EPSILON) {
      return minPossible;
    }

    const leftKeyValueIds = left.kvPairIds;
    const rightKeyValueIds = right.kvPairIds;

    // choose smaller array for outer loop to reduce lookups
    const [small, large] =
      leftKeyValueIds.length < rightKeyValueIds.length ? [left, right] : [left, right];

    let interWeight = 0;
    let i = 0;
    let j = 0;

    const smallKvIds = small.kvPairIds;
    const largeKvIds = large.kvPairIds;

    while (i < smallKvIds.length && j < largeKvIds.length) {
      const idSmall = smallKvIds[i];
      const idLarge = largeKvIds[j];
      if (idSmall === idLarge) {
        interWeight += kvWeightById[idSmall];
        i++;
        j++;
      } else if (idSmall < idLarge) {
        i++;
      } else {
        j++;
      }
    }

    const totalWeight = small.kvWeightSum + large.kvWeightSum - interWeight;
    const dValues = totalWeight > 0 ? 1 - interWeight / totalWeight : 1;

    return SCHEMA_WEIGHT * schemaDistance + VALUE_WEIGHT * dValues;
  }

  traverseDocs();

  calculateFieldWeights();

  determineValueTracking(valueCardinalityLimit);

  populateKvWeights();

  finalizeDocs();

  const { clusters, noise } = dbscan(docs, EPSILON, MIN_POINTS, hybridDistance);

  return {
    sampled: hits.length,
    noise,
    clusters: clusters.map((cluster) => {
      const samples = cluster.map((i) => hits[i]);
      return {
        count: cluster.length,
        samples,
        analysis: formatDocumentAnalysis(
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
