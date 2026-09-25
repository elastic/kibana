/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem, KiTypeCount } from '../../common/http_api/ai_indices';
import { MEMORY_KI_TYPES } from '../../common/memory';
import { describeAiIndexAggregations } from './describe_aggregations';
import { describeAiIndexFields } from './describe_fields';
import { buildExampleQueries, EXCLUDE_MEMORY_KI_TYPES_FILTER } from './example_queries';
import { buildMemoryExampleQueries } from './memory_example_queries';
import type { AiIndexField, AiIndexTagCount } from './types';

const MEMORY_KI_TYPE_SET: ReadonlySet<string> = new Set(MEMORY_KI_TYPES);

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
  `AI-index registry ID: ${id}`,
  ...(description ? [description] : []),
  `Backing Elasticsearch target (use only in ES|QL queries): ${dest.value}`,
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
    counts
      .filter(({ type }) => !MEMORY_KI_TYPE_SET.has(type))
      .map(({ type, count }) => [type, count])
  );

const tagCountsSection = (counts: AiIndexTagCount[]): string[] =>
  countsSection(
    'Tags',
    counts.map(({ tag, count }) => [tag, count])
  );

const memorySection = (
  { memory_enabled: memoryEnabled }: AiIndexHttpItem,
  target: string
): string[] => {
  if (!memoryEnabled) {
    return [];
  }

  const { crossSession, currentConversation } = buildMemoryExampleQueries(target);

  return [
    'Memory',
    'Memory writes are enabled for this AI-index registry entry.',
    'Available memory types',
    'memory.session',
    'memory.session_fact',
    'Use platform.context_engine.remember to write memory.',
    'Use platform.context_engine.forget with a memory id to tombstone memory.',
    'Unless the task specifically calls for memory, exclude memory types from ordinary KI retrieval:',
    EXCLUDE_MEMORY_KI_TYPES_FILTER,
    'For cross-session recall, search granular facts with hybrid retrieval:',
    crossSession,
    'For recall from the current Agent Builder conversation:',
    currentConversation,
    'Select the latest revision before filtering deleted or expired memories, or an older active data-stream revision can reappear.',
    'The second session sort presents the selected recent window chronologically. References identify the source conversations.',
  ];
};

const exampleQueriesSection = (target: string, excludeMemory: boolean): string[] => [
  'Example queries (adapt field names for non-canonical indices)',
  ...buildExampleQueries(target, { excludeMemory }).flatMap(({ title, esql }) => ['', title, esql]),
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
    memorySection(aiIndex, target),
    exampleQueriesSection(target, true),
  ]);
};
