/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldCapsResponse, SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { TruncatedDocumentAnalysis } from '@kbn/ai-tools';
import { mergeSampleDocumentsWithFieldCaps, sortAndTruncateAnalyzedFields } from '@kbn/ai-tools';
import type { Logger } from '@kbn/core/server';
import { DBSCAN } from 'density-clustering';
import { getFlattenedObject } from '@kbn/std';

const EPS = 0.3;
const MIN_POINTS = 5;
// how much extra weight to give shared keyword values vs schema
const ALPHA = 0.8; // schema weight
const BETA = 0.2; // value weight

/**
 * Compute pure Jaccard distance on two sorted int-lists.
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

export function clusterDocs({
  hits,
  fieldCaps,
  logger,
}: {
  hits: SearchHit[];
  fieldCaps: FieldCapsResponse;
  logger: Logger;
}): ClusterDocsResponse {
  if (hits.length === 0) {
    return { sampled: 0, noise: [], clusters: [] };
  }

  // 2) First pass: build maps for schema IDs and string-value cardinality
  const fieldToId = new Map<string, number>();
  const valueCount = new Map<string, Set<string>>(); // field → distinct string values
  interface DocPoint {
    id: string;
    fieldIds: number[];
    kvPairs: string[]; // e.g. "service.name:auth"
  }
  const docs: DocPoint[] = [];

  for (const hit of hits) {
    const src = {
      ...hit.fields,
      ...getFlattenedObject(hit._source ?? {}),
    };
    const names = Object.keys(src);
    const ids: number[] = [];
    const kvs: string[] = [];

    for (const f of names) {
      // 2a) schema ID
      let fid = fieldToId.get(f);
      if (fid === undefined) {
        fid = fieldToId.size;
        fieldToId.set(f, fid);
      }
      ids.push(fid);

      // 2b) string-value capture
      const v = src[f];
      if (typeof v === 'string') {
        // record this field:value occurrence
        kvs.push(`${f}:${v}`);
        if (!valueCount.has(f)) valueCount.set(f, new Set());
        valueCount.get(f)!.add(v);
      }
    }

    ids.sort((a, b) => a - b);
    docs.push({ id: hit._id as string, fieldIds: ids, kvPairs: kvs });
  }

  // 3) Compute inverse-cardinality weights for each string field
  const fieldWeight = new Map<string, number>();
  for (const [f, valSet] of valueCount) {
    const card = valSet.size;
    // down-weight high-card fields heavily
    fieldWeight.set(f, 1 / Math.log(card + 1));
  }

  // 4) hybrid distance = α·schema + β·weighted-Jaccard(kv)
  function hybridDistance(a: DocPoint, b: DocPoint): number {
    // schema part
    const dSchema = jaccardDistance(a.fieldIds, b.fieldIds);

    // weighted-Jaccard on kvPairs
    const sa = new Set(a.kvPairs);
    const sb = new Set(b.kvPairs);
    const union = new Set<string>([...sa, ...sb]);

    let interW = 0;
    let totalW = 0;
    for (const kv of union) {
      const [f] = kv.split(':');
      const w = fieldWeight.get(f) ?? 0;
      totalW += w;
      if (sa.has(kv) && sb.has(kv)) {
        interW += w;
      }
    }
    const dValues = totalW > 0 ? 1 - interW / totalW : 1;

    return ALPHA * dSchema + BETA * dValues;
  }

  // 5) run DBSCAN on our DocPoint[] (cast to any to satisfy typings)
  const scan = new DBSCAN();
  const clusters: number[][] = (scan as any).run(docs, EPS, MIN_POINTS, hybridDistance);
  const noise: number[] = (scan as any).noise;

  // 6) build the response payload
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
          { dropEmpty: true }
        ),
      };
    }),
  };
}
