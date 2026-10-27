/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem, KiTypeCount } from '../../common/http_api/ai_indices';
import {
  LONG_TERM_MEMORY_AI_INDEX_ID,
  MEMORY_AI_INDEX_IDS,
  MEMORY_KI_TYPES,
  SHORT_TERM_MEMORY_AI_INDEX_ID,
} from '../../common/memory';
import { describeAiIndexAggregations } from './describe_aggregations';
import { describeAiIndexFields } from './describe_fields';
import { buildExampleQueries } from './example_queries';
import {
  buildLongTermLinksExampleQuery,
  buildLongTermMemoryExampleQuery,
  buildMemoryExampleQueries,
} from './memory_example_queries';
import type { AiIndexField, AiIndexTagCount } from './types';

const MEMORY_KI_TYPE_SET: ReadonlySet<string> = new Set(MEMORY_KI_TYPES);
const MEMORY_AI_INDEX_ID_SET: ReadonlySet<string> = new Set(MEMORY_AI_INDEX_IDS);

const isMemoryStore = ({ id, managed }: AiIndexHttpItem): boolean =>
  managed && MEMORY_AI_INDEX_ID_SET.has(id);

export interface DescribeAiIndexParams {
  esClient: ElasticsearchClient;
  aiIndex: AiIndexHttpItem;
  spaceId: string;
  includeMemory: boolean;
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

const kiTypeCountsSection = (counts: KiTypeCount[], hideMemoryTypes: boolean): string[] =>
  countsSection(
    'Knowledge item types',
    counts
      .filter(({ type }) => !hideMemoryTypes || !MEMORY_KI_TYPE_SET.has(type))
      .map(({ type, count }) => [type, count])
  );

const tagCountsSection = (counts: AiIndexTagCount[]): string[] =>
  countsSection(
    'Tags',
    counts.map(({ tag, count }) => [tag, count])
  );

const shortTermMemorySection = (target: string): string[] => {
  const { crossSession } = buildMemoryExampleQueries(target);

  return [
    'Memory',
    'This is the short-term memory store for this space.',
    'Available memory types',
    'memory.session',
    'memory.session_fact',
    'Use platform.context_engine.remember to write memory.',
    'Use platform.context_engine.forget with a memory id to tombstone memory.',
    'For cross-session recall, search granular facts with hybrid retrieval:',
    crossSession,
    'Select the latest revision before filtering deleted or expired memories, or an older active data-stream revision can reappear.',
    'References identify the source conversations.',
  ];
};

const longTermMemorySection = (target: string): string[] => [
  'Memory',
  'This is the long-term memory store for this space. Dreaming writes it from short-term memory; agents only read it.',
  'Available memory types',
  'memory.fact: a statement about this environment that stays true.',
  'memory.entity: a named person, team, system, service, project or data set, and what is known about it.',
  'memory.procedure: reusable numbered steps for a recurring task. They come from past sessions; check they fit the situation before following them.',
  'memory.relationship: a link between two of the memories above. Its title reads as a sentence, such as "Team Search owns Context Engine".',
  'Each memory has one live document. Superseded and refuted memories are tombstoned; outdated memories have expired.',
  'To recall facts, entities and procedures, use hybrid retrieval over live memories:',
  buildLongTermMemoryExampleQuery(target),
  'To list what a memory is linked to, find the relationships that reference it:',
  buildLongTermLinksExampleQuery(target),
  'References with relation derived_from point at the short-term memories a memory came from. References with relation relates_to point at the two ends of a relationship.',
];

const memorySection = (aiIndex: AiIndexHttpItem, target: string): string[] => {
  if (!isMemoryStore(aiIndex)) {
    return [];
  }
  return aiIndex.id === SHORT_TERM_MEMORY_AI_INDEX_ID
    ? shortTermMemorySection(target)
    : aiIndex.id === LONG_TERM_MEMORY_AI_INDEX_ID
    ? longTermMemorySection(target)
    : [];
};

const exampleQueriesSection = (dest: AiIndexHttpItem['dest'], excludeMemory: boolean): string[] => [
  'Example queries (adapt field names for non-canonical indices)',
  ...buildExampleQueries(dest, { excludeMemory }).flatMap(({ title, esql }) => ['', title, esql]),
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
  includeMemory,
}: DescribeAiIndexParams): Promise<string> => {
  const target = aiIndex.dest.value;
  const memoryStore = isMemoryStore(aiIndex);
  const { fields, allFields, semanticFields, omittedFieldCount } = await describeAiIndexFields({
    esClient,
    target,
  });
  const { kiTypeCounts, tagCounts } = await describeAiIndexAggregations({
    esClient,
    dest: aiIndex.dest,
    spaceId,
    fields: allFields,
    excludeMemory: !memoryStore,
  });

  return renderSections([
    headerSection(aiIndex),
    fieldsSection(fields, omittedFieldCount),
    semanticFieldsSection(semanticFields),
    kiTypeCountsSection(kiTypeCounts, !memoryStore),
    tagCountsSection(tagCounts),
    includeMemory ? memorySection(aiIndex, target) : [],
    exampleQueriesSection(aiIndex.dest, includeMemory && !memoryStore),
  ]);
};
