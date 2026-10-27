/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem, KiTypeCount } from '../../common/http_api/ai_indices';
import { isMemoryKiType } from '../../common/memory';
import { describeAiIndexAggregations } from './describe_aggregations';
import { describeAiIndexFields } from './describe_fields';
import { buildExampleQueries, EXCLUDE_MEMORY_KI_TYPES_FILTER } from './example_queries';
import { buildMemoryExampleQueries } from './memory_example_queries';
import type { AiIndexField, AiIndexTagCount } from './types';

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

const kiTypeCountsSection = (counts: KiTypeCount[]): string[] =>
  countsSection(
    'Knowledge item types',
    counts.filter(({ type }) => !isMemoryKiType(type)).map(({ type, count }) => [type, count])
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

  const { crossSession, entityLookup, relationships } = buildMemoryExampleQueries(target);

  return [
    'Long-term memory',
    "This AI index holds long-term memory shared with everyone who can read it: memories promoted from users' short-term memory, extracted from traces, and distilled by the memory automations.",
    'Memory types (every memory type starts with "memory.")',
    'memory.session, memory.session_fact: promoted and synthesized session memories',
    'memory.fact.<kind>: an extracted fact, such as an incident or a preference',
    'memory.entity.<kind>: a named thing, such as a service or a person; its attributes are in content',
    'memory.relationship.<kind>: an edge between two facts or entities; references.uri names both ends as ki://<id>',
    "Agents do not write here directly: platform.context_engine.remember writes the user's private short-term memory, and automations decide what becomes long-term memory.",
    'Unless the task specifically calls for memory, exclude memory types from ordinary KI retrieval:',
    EXCLUDE_MEMORY_KI_TYPES_FILTER,
    'For cross-session recall, search granular facts with hybrid retrieval:',
    crossSession,
    'To look up an entity or fact by name (?query):',
    entityLookup,
    'To follow relationships from a memory id (?uri is ki://<id>):',
    relationships,
    'Select the latest revision before filtering deleted or expired memories, or an older active data-stream revision can reappear.',
    'References identify the source conversations and memories.',
  ];
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
  const { fields, allFields, semanticFields, omittedFieldCount } = await describeAiIndexFields({
    esClient,
    target,
  });
  const { kiTypeCounts, tagCounts } = await describeAiIndexAggregations({
    esClient,
    dest: aiIndex.dest,
    spaceId,
    fields: allFields,
  });

  return renderSections([
    headerSection(aiIndex),
    fieldsSection(fields, omittedFieldCount),
    semanticFieldsSection(semanticFields),
    kiTypeCountsSection(kiTypeCounts),
    tagCountsSection(tagCounts),
    includeMemory ? memorySection(aiIndex, target) : [],
    exampleQueriesSection(aiIndex.dest, includeMemory),
  ]);
};
