/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { estypes } from '@elastic/elasticsearch';
import type { IScopedClusterClient } from '@kbn/core/server';
import type { EvidenceField, EvidenceFieldKind, IndexEvidence, RecognizerModuleHit } from './types';

const MAX_KEYWORD_FIELDS = 30;
const MAX_NUMERIC_FIELDS = 30;
const SAMPLE_DOC_COUNT = 20;
const TOP_VALUES_SIZE = 5;
const TARGET_COVERAGE_BUCKETS = 200;
const MIN_COVERAGE_BUCKET_MS = 60 * 1000;
const MAX_SAMPLE_STRING_LENGTH = 200;
const MAX_SAMPLE_ARRAY_LENGTH = 5;
const MAX_SAMPLE_DEPTH = 4;

const NUMERIC_TYPES = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
]);

const getFieldKind = (type: string): EvidenceFieldKind | undefined => {
  if (type === 'keyword' || type === 'constant_keyword') return 'keyword';
  if (type === 'ip') return 'ip';
  if (NUMERIC_TYPES.has(type)) return 'numeric';
  if (type === 'date' || type === 'date_nanos') return 'date';
  if (type === 'geo_point') return 'geo_point';
  if (type === 'text' || type === 'match_only_text') return 'text';
  return undefined;
};

interface MappedField {
  name: string;
  kind: EvidenceFieldKind;
  aggregatable: boolean;
}

const getMappedFields = (fieldCaps: estypes.FieldCapsResponse): MappedField[] => {
  const mapped: MappedField[] = [];
  Object.entries(fieldCaps.fields).forEach(([name, capsByType]) => {
    if (name.startsWith('_')) return;
    const types = Object.entries(capsByType).filter(([type]) => type !== 'unmapped');
    // Fields mapped with different types across indices cannot be used safely.
    if (types.length !== 1) return;
    const [[type, caps]] = types;
    const kind = getFieldKind(type);
    if (kind === undefined) return;
    mapped.push({ name, kind, aggregatable: caps.aggregatable });
  });
  return mapped.sort((a, b) => a.name.localeCompare(b.name));
};

const chooseTimeField = (dateFields: MappedField[]): string | undefined => {
  const usable = dateFields.filter(({ aggregatable }) => aggregatable);
  return (
    usable.find(({ name }) => name === '@timestamp') ??
    usable.find(({ name }) => /time|date/i.test(name)) ??
    usable[0]
  )?.name;
};

const trimValue = (value: unknown, depth: number): unknown => {
  if (typeof value === 'string') {
    return value.length > MAX_SAMPLE_STRING_LENGTH
      ? `${value.slice(0, MAX_SAMPLE_STRING_LENGTH)}...`
      : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_SAMPLE_ARRAY_LENGTH).map((item) => trimValue(item, depth + 1));
  }
  if (value !== null && typeof value === 'object') {
    if (depth >= MAX_SAMPLE_DEPTH) return '[object]';
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, trimValue(item, depth + 1)])
    );
  }
  return value;
};

interface StatsAggregate {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
}

interface CardinalityAggregate {
  value: number;
}

interface TermsAggregate {
  buckets: Array<{ key: string | number }>;
}

interface HistogramAggregate {
  buckets: Array<{ doc_count: number }>;
}

export interface GatherEvidenceParams {
  client: IScopedClusterClient;
  index: string;
  start: number;
  end: number;
  findRecognizerMatches?: (index: string) => Promise<RecognizerModuleHit[]>;
}

/**
 * Collects the facts about an index which the model needs in order to propose jobs.
 * Everything is run as the current user.
 */
export const gatherEvidence = async ({
  client,
  index,
  start,
  end,
  findRecognizerMatches,
}: GatherEvidenceParams): Promise<IndexEvidence> => {
  const fieldCaps = await client.asCurrentUser.fieldCaps({ index, fields: '*' });
  const mappedFields = getMappedFields(fieldCaps);

  const timeField = chooseTimeField(mappedFields.filter(({ kind }) => kind === 'date'));
  if (timeField === undefined) {
    throw Boom.badRequest(`No usable date field was found in "${index}".`);
  }

  const keywordFields = mappedFields
    .filter(({ kind, aggregatable }) => (kind === 'keyword' || kind === 'ip') && aggregatable)
    .slice(0, MAX_KEYWORD_FIELDS);
  const numericFields = mappedFields
    .filter(({ kind, aggregatable }) => kind === 'numeric' && aggregatable)
    .slice(0, MAX_NUMERIC_FIELDS);
  const otherFields = mappedFields.filter(
    ({ kind }) => kind === 'geo_point' || kind === 'text' || kind === 'date'
  );

  const coverageBucketMs = Math.max(
    MIN_COVERAGE_BUCKET_MS,
    Math.ceil((end - start) / TARGET_COVERAGE_BUCKETS)
  );

  const aggs: Record<string, estypes.AggregationsAggregationContainer> = {
    coverage: {
      date_histogram: {
        field: timeField,
        fixed_interval: `${Math.ceil(coverageBucketMs / 1000)}s`,
        min_doc_count: 0,
        extended_bounds: { min: start, max: end },
      },
    },
  };
  keywordFields.forEach(({ name, kind }, i) => {
    aggs[`card_${i}`] = { cardinality: { field: name } };
    if (kind === 'keyword') {
      aggs[`top_${i}`] = { terms: { field: name, size: TOP_VALUES_SIZE } };
    }
  });
  numericFields.forEach(({ name }, i) => {
    aggs[`stats_${i}`] = { stats: { field: name } };
  });

  const [searchResponse, recognizerModules] = await Promise.all([
    client.asCurrentUser.search({
      index,
      size: SAMPLE_DOC_COUNT,
      track_total_hits: true,
      sort: [{ [timeField]: { order: 'desc', unmapped_type: 'date' } }],
      query: {
        range: { [timeField]: { gte: start, lte: end, format: 'epoch_millis' } },
      },
      aggs,
    }),
    findRecognizerMatches
      ? findRecognizerMatches(index).catch(() => [] as RecognizerModuleHit[])
      : Promise.resolve([] as RecognizerModuleHit[]),
  ]);

  const total = searchResponse.hits.total;
  const docCount = typeof total === 'number' ? total : total?.value ?? 0;
  if (docCount === 0) {
    throw Boom.badRequest(`No documents were found in "${index}" in the requested time range.`);
  }

  const aggregations = (searchResponse.aggregations ?? {}) as Record<string, unknown>;

  const coverageBuckets = (aggregations.coverage as HistogramAggregate | undefined)?.buckets ?? [];
  const emptyBucketFraction =
    coverageBuckets.length > 0
      ? coverageBuckets.filter(({ doc_count: count }) => count === 0).length /
        coverageBuckets.length
      : 0;

  const fields: EvidenceField[] = [];
  keywordFields.forEach(({ name, kind }, i) => {
    const cardinality = (aggregations[`card_${i}`] as CardinalityAggregate | undefined)?.value;
    const topValues = (aggregations[`top_${i}`] as TermsAggregate | undefined)?.buckets.map(
      ({ key }) => String(key)
    );
    fields.push({ name, kind, cardinality, ...(topValues ? { topValues } : {}) });
  });
  numericFields.forEach(({ name }, i) => {
    const stats = aggregations[`stats_${i}`] as StatsAggregate | undefined;
    fields.push({
      name,
      kind: 'numeric',
      nullRate: stats ? 1 - stats.count / docCount : 1,
      ...(stats && stats.min !== null && stats.max !== null && stats.avg !== null
        ? { numericStats: { min: stats.min, max: stats.max, avg: stats.avg } }
        : {}),
    });
  });
  otherFields.forEach(({ name, kind }) => fields.push({ name, kind }));

  const sampleDocs = searchResponse.hits.hits.flatMap(({ _source: source }) =>
    source ? [trimValue(source, 0) as Record<string, unknown>] : []
  );

  return {
    index,
    timeField,
    timeRange: { start, end },
    docCount,
    emptyBucketFraction,
    fields,
    sampleDocs,
    recognizerModules,
  };
};
