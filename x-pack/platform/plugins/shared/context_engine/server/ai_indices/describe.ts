/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem, KiTypeCount } from '../../common/http_api/ai_indices';
import { describeAiIndexAggregations } from './describe_aggregations';
import { describeAiIndexFields } from './describe_fields';
import { buildExampleQueries } from './example_queries';
import type { AiIndexField, AiIndexTagCount } from './types';

export interface DescribeAiIndexParams {
  esClient: ElasticsearchClient;
  aiIndex: AiIndexHttpItem;
  spaceId: string;
}

const fieldLine = ({ path, type, searchable, aggregatable }: AiIndexField): string =>
  [
    `${path}: ${type}`,
    ...(searchable ? ['searchable'] : []),
    ...(aggregatable ? ['aggregatable'] : []),
  ].join(', ');

const headerSection = ({ id, description, dest }: AiIndexHttpItem): string[] => [
  `AI index: ${id}`,
  ...(description ? [description] : []),
  `Query with ES|QL against: ${dest.value}`,
];

const fieldsSection = (fields: AiIndexField[], omittedFieldCount: number): string[] => {
  const heading =
    omittedFieldCount > 0
      ? `Fields (showing ${fields.length} of ${fields.length + omittedFieldCount})`
      : 'Fields';
  return [heading, ...(fields.length > 0 ? fields.map(fieldLine) : ['(none)'])];
};

const semanticFieldsSection = (paths: string[]): string[] =>
  paths.length > 0 ? ['Semantic fields', ...paths] : [];

/** `JSON.stringify` quotes each key, so keys holding spaces, commas or quotes stay unambiguous. */
const countsSection = (heading: string, counts: Array<[key: string, count: number]>): string[] =>
  counts.length > 0
    ? [heading, ...counts.map(([key, count]) => `${JSON.stringify(key)}: ${count}`)]
    : [];

const kiTypeCountsSection = (counts: KiTypeCount[]): string[] =>
  countsSection(
    'Knowledge item types',
    counts.map(({ type, count }) => [type, count])
  );

const tagCountsSection = (counts: AiIndexTagCount[]): string[] =>
  countsSection(
    'Tags',
    counts.map(({ tag, count }) => [tag, count])
  );

const memorySection = (
  { memory_enabled: memoryEnabled }: AiIndexHttpItem,
  counts: KiTypeCount[],
  target: string
): string[] => {
  if (!memoryEnabled) {
    return [];
  }

  const countByType = new Map(counts.map(({ type, count }) => [type, count]));
  return [
    'Memory',
    'Memory writes are enabled for this AI-index registry entry.',
    'Available memory types',
    `memory.session: ${countByType.get('memory.session') ?? 0}`,
    `memory.session_fact: ${countByType.get('memory.session_fact') ?? 0}`,
    'Use platform.context_engine.remember to write memory.',
    'Use platform.context_engine.forget with a memory id to tombstone memory.',
    'Recall active, unexpired memory with ES|QL:',
    `FROM ${target}`,
    '| WHERE type IN ("memory.session", "memory.session_fact")',
    '| INLINE STATS latest_at = MAX(@timestamp) BY id',
    '| WHERE @timestamp == latest_at',
    '  AND (governance.lifecycle.status IS NULL OR governance.lifecycle.status != "deleted")',
    '  AND (expires_at IS NULL OR expires_at > NOW())',
    '| SORT updated_at DESC',
    '| LIMIT 10',
  ];
};

const exampleQueriesSection = (target: string): string[] => [
  'Example queries (adapt field names for non-canonical indices)',
  ...buildExampleQueries(target).flatMap(({ title, esql }) => ['', title, esql]),
];

/** One item per line; sections separated by a blank line; empty sections dropped. */
const renderSections = (sections: string[][]): string =>
  sections
    .filter((lines) => lines.length > 0)
    .map((lines) => lines.join('\n'))
    .join('\n\n');

/**
 * Free-form context block for an agent: registry entry, what backing indices expose, and how to
 * query them. Read as current user; counts are space-filtered.
 */
export const describeAiIndex = async ({
  esClient,
  aiIndex,
  spaceId,
}: DescribeAiIndexParams): Promise<string> => {
  const target = aiIndex.dest.value;
  const { fields, allFields, semanticFields, omittedFieldCount } = await describeAiIndexFields({
    esClient,
    target,
  });
  const { kiTypeCounts, tagCounts } = await describeAiIndexAggregations({
    esClient,
    target,
    spaceId,
    fields: allFields,
  });

  return renderSections([
    headerSection(aiIndex),
    fieldsSection(fields, omittedFieldCount),
    semanticFieldsSection(semanticFields),
    kiTypeCountsSection(kiTypeCounts),
    tagCountsSection(tagCounts),
    memorySection(aiIndex, kiTypeCounts, target),
    exampleQueriesSection(target),
  ]);
};
