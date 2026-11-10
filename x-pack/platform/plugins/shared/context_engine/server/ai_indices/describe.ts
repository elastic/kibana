/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexHttpItem, KiTypeCount } from '../../common/http_api/ai_indices';
import { MEMORY_KI_TYPES } from '../../common/memory';
import {
  dreamingTypesOf,
  ENTITY_TYPE_PREFIX,
  FACT_TYPE_PREFIX,
  isDreamingConfigured,
  type DreamingEntityType,
  type DreamingFactType,
} from '../../common/dreaming';
import { describeAiIndexAggregations } from './describe_aggregations';
import { describeAiIndexFields } from './describe_fields';
import { buildExampleQueries, excludeMemoryKiTypesFilter } from './example_queries';
import { buildMemoryExampleQueries, type MemoryExampleQueries } from './memory_example_queries';
import type { AiIndexField, AiIndexTagCount } from './types';

const MEMORY_KI_TYPE_SET: ReadonlySet<string> = new Set(MEMORY_KI_TYPES);

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

const kiTypeCountsSection = (counts: KiTypeCount[], dreamedPrefixes: readonly string[]): string[] =>
  countsSection(
    'Knowledge item types',
    counts
      .filter(
        ({ type }) =>
          !MEMORY_KI_TYPE_SET.has(type) &&
          !dreamedPrefixes.some((prefix) => type.startsWith(prefix))
      )
      .map(({ type, count }) => [type, count])
  );

const tagCountsSection = (counts: AiIndexTagCount[]): string[] =>
  countsSection(
    'Tags',
    counts.map(({ tag, count }) => [tag, count])
  );

interface DreamedTypes {
  facts: DreamingFactType[];
  entities: DreamingEntityType[];
}

const NO_DREAMED_TYPES: DreamedTypes = { facts: [], entities: [] };

const configuredDreamedTypes = ({ dreaming }: AiIndexHttpItem): DreamedTypes => {
  if (!dreaming || !isDreamingConfigured(dreaming)) {
    return NO_DREAMED_TYPES;
  }
  const { facts, entities } = dreamingTypesOf(dreaming);
  return { facts, entities };
};

/** The prefixes of the kinds a config dreams, so ordinary retrieval leaves out only what dreaming writes. */
const dreamedPrefixesOf = ({ facts, entities }: DreamedTypes): string[] => [
  ...(facts.length > 0 ? [FACT_TYPE_PREFIX] : []),
  ...(entities.length > 0 ? [ENTITY_TYPE_PREFIX] : []),
];

const dreamedKiTypes = ({ facts, entities }: DreamedTypes): string[] => [
  ...facts.map(({ type }) => `${FACT_TYPE_PREFIX}${type}`),
  ...entities.map(({ type }) => `${ENTITY_TYPE_PREFIX}${type}`),
];

const dreamedTypeLine = (
  kiType: string,
  counts: ReadonlyMap<string, number>,
  { description, attributes = [] }: { description?: string; attributes?: string[] }
): string =>
  `${JSON.stringify(kiType)}: ${counts.get(kiType) ?? 0}${description ? ` - ${description}` : ''}${
    attributes.length > 0 ? ` (attributes: ${attributes.join(', ')})` : ''
  }`;

const dreamedLines = (
  { facts, entities }: DreamedTypes,
  dreamedTypeCounts: KiTypeCount[],
  queries: MemoryExampleQueries
): string[] => {
  const counts = new Map(dreamedTypeCounts.map(({ type, count }) => [type, count]));
  return [
    ...(facts.length > 0
      ? [
          `Dreaming turns memories into long-term facts, each typed ${FACT_TYPE_PREFIX}<fact type> and written to stand on its own. Fact types, with how many facts each has:`,
          ...facts.map(({ type, description }) =>
            dreamedTypeLine(`${FACT_TYPE_PREFIX}${type}`, counts, { description })
          ),
          'Facts of one type, newest first:',
          queries.factsOfType,
          'The most recent facts:',
          queries.recentFacts,
        ]
      : []),
    ...(entities.length > 0
      ? [
          `Dreaming keeps the things memories are about as entities, each typed ${ENTITY_TYPE_PREFIX}<entity type>: title holds its name, and content a summary of what is known about it, including its attribute values. Entity types, with how many entities each has:`,
          ...entities.map(({ type, description, attributes }) =>
            dreamedTypeLine(`${ENTITY_TYPE_PREFIX}${type}`, counts, { description, attributes })
          ),
          'An entity by name, across entity types:',
          queries.entityByName,
          'Entities of one type, newest first:',
          queries.entitiesOfType,
        ]
      : []),
  ];
};

const dreamedKindsText = ({ facts, entities }: DreamedTypes): string =>
  [...(facts.length > 0 ? ['facts'] : []), ...(entities.length > 0 ? ['entities'] : [])].join(
    ' and '
  );

const memorySection = (
  aiIndex: AiIndexHttpItem,
  target: string,
  dreamedTypeCounts: KiTypeCount[]
): string[] => {
  if (!isDreamingConfigured(aiIndex.dreaming)) {
    return [];
  }

  const types = configuredDreamedTypes(aiIndex);
  const includeFacts = types.facts.length > 0;
  const dreamedKinds = dreamedKindsText(types);
  const queries = buildMemoryExampleQueries(target, { includeFacts });

  return [
    'Memory',
    'This AI index takes memories: dreaming is set up for it.',
    'Available memory types',
    'memory.session',
    'memory.session_fact',
    'Use platform.context_engine.remember to write memory.',
    'Use platform.context_engine.forget with a memory id to tombstone memory.',
    `Unless the task specifically calls for memory, exclude memory types${
      dreamedKinds ? `, and the ${dreamedKinds} dreaming writes,` : ''
    } from ordinary KI retrieval:`,
    excludeMemoryKiTypesFilter(dreamedPrefixesOf(types)),
    ...dreamedLines(types, dreamedTypeCounts, queries),
    includeFacts
      ? 'For cross-session recall, search session facts and long-term facts together with hybrid retrieval, so memories dreaming has not reached yet are found too:'
      : 'For cross-session recall, search granular facts with hybrid retrieval:',
    queries.crossSession,
    'Select the latest revision before filtering deleted or expired memories, or an older active data-stream revision can reappear.',
    'References identify the source conversations.',
  ];
};

const exampleQueriesSection = (
  dest: AiIndexHttpItem['dest'],
  excludeMemory: boolean,
  dreamedPrefixes: readonly string[]
): string[] => [
  'Example queries (adapt field names for non-canonical indices)',
  ...buildExampleQueries(dest, { excludeMemory, dreamedPrefixes }).flatMap(({ title, esql }) => [
    '',
    title,
    esql,
  ]),
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
  const dreamedTypes = includeMemory ? configuredDreamedTypes(aiIndex) : NO_DREAMED_TYPES;
  const dreamedPrefixes = dreamedPrefixesOf(dreamedTypes);
  const { kiTypeCounts, tagCounts, dreamedTypeCounts } = await describeAiIndexAggregations({
    esClient,
    dest: aiIndex.dest,
    spaceId,
    fields: allFields,
    dreamedPrefixes,
    dreamedTypes: dreamedKiTypes(dreamedTypes),
  });

  return renderSections([
    headerSection(aiIndex),
    fieldsSection(fields, omittedFieldCount),
    semanticFieldsSection(semanticFields),
    kiTypeCountsSection(kiTypeCounts, dreamedPrefixes),
    tagCountsSection(tagCounts),
    includeMemory ? memorySection(aiIndex, target, dreamedTypeCounts) : [],
    exampleQueriesSection(aiIndex.dest, includeMemory, dreamedPrefixes),
  ]);
};
