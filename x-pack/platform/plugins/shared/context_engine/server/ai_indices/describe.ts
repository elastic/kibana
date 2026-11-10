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
  FACT_TYPE_PREFIX,
  isDreamedKiType,
  isDreamingConfigured,
  type DreamingFactType,
} from '../../common/dreaming';
import { describeAiIndexAggregations } from './describe_aggregations';
import { describeAiIndexFields } from './describe_fields';
import { buildExampleQueries, excludeMemoryKiTypesFilter } from './example_queries';
import { buildMemoryExampleQueries } from './memory_example_queries';
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

const kiTypeCountsSection = (counts: KiTypeCount[], dreams: boolean): string[] =>
  countsSection(
    'Knowledge item types',
    counts
      .filter(({ type }) => !MEMORY_KI_TYPE_SET.has(type) && !(dreams && isDreamedKiType(type)))
      .map(({ type, count }) => [type, count])
  );

const tagCountsSection = (counts: AiIndexTagCount[]): string[] =>
  countsSection(
    'Tags',
    counts.map(({ tag, count }) => [tag, count])
  );

const factKiType = (type: string): string => `${FACT_TYPE_PREFIX}${type}`;

const factTypeLine = (
  { type, description }: DreamingFactType,
  counts: ReadonlyMap<string, number>
): string => {
  const kiType = factKiType(type);
  return `${JSON.stringify(kiType)}: ${counts.get(kiType) ?? 0}${
    description ? ` - ${description}` : ''
  }`;
};

const factsLines = (
  factTypes: DreamingFactType[],
  factTypeCounts: KiTypeCount[],
  { factsOfType, recentFacts }: { factsOfType: string; recentFacts: string }
): string[] => {
  const counts = new Map(factTypeCounts.map(({ type, count }) => [type, count]));
  return [
    `Dreaming turns memories into long-term facts, each typed ${FACT_TYPE_PREFIX}<fact type> and written to stand on its own. Fact types, with how many facts each has:`,
    ...factTypes.map((factType) => factTypeLine(factType, counts)),
    'Facts of one type, newest first:',
    factsOfType,
    'The most recent facts:',
    recentFacts,
  ];
};

const configuredFactTypes = ({ dreaming }: AiIndexHttpItem): DreamingFactType[] =>
  dreaming && isDreamingConfigured(dreaming) ? dreamingTypesOf(dreaming).facts : [];

const memorySection = (
  aiIndex: AiIndexHttpItem,
  target: string,
  factTypeCounts: KiTypeCount[]
): string[] => {
  if (!isDreamingConfigured(aiIndex.dreaming)) {
    return [];
  }

  const factTypes = configuredFactTypes(aiIndex);
  const includeFacts = factTypes.length > 0;
  const { crossSession, ...factQueries } = buildMemoryExampleQueries(target, { includeFacts });

  return [
    'Memory',
    'This AI index takes memories: dreaming is set up for it.',
    'Available memory types',
    'memory.session',
    'memory.session_fact',
    'Use platform.context_engine.remember to write memory.',
    'Use platform.context_engine.forget with a memory id to tombstone memory.',
    'Unless the task specifically calls for memory, exclude memory types, and the facts, entities and procedures dreaming writes, from ordinary KI retrieval:',
    excludeMemoryKiTypesFilter(true),
    ...(includeFacts ? factsLines(factTypes, factTypeCounts, factQueries) : []),
    includeFacts
      ? 'For cross-session recall, search session facts and long-term facts together with hybrid retrieval, so memories dreaming has not reached yet are found too:'
      : 'For cross-session recall, search granular facts with hybrid retrieval:',
    crossSession,
    'Select the latest revision before filtering deleted or expired memories, or an older active data-stream revision can reappear.',
    'References identify the source conversations.',
  ];
};

const exampleQueriesSection = (
  dest: AiIndexHttpItem['dest'],
  excludeMemory: boolean,
  dreams: boolean
): string[] => [
  'Example queries (adapt field names for non-canonical indices)',
  ...buildExampleQueries(dest, { excludeMemory, dreams }).flatMap(({ title, esql }) => [
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
  const dreams = includeMemory && isDreamingConfigured(aiIndex.dreaming);
  const { kiTypeCounts, tagCounts, factTypeCounts } = await describeAiIndexAggregations({
    esClient,
    dest: aiIndex.dest,
    spaceId,
    fields: allFields,
    dreams,
    factTypes: dreams ? configuredFactTypes(aiIndex).map(({ type }) => factKiType(type)) : [],
  });

  return renderSections([
    headerSection(aiIndex),
    fieldsSection(fields, omittedFieldCount),
    semanticFieldsSection(semanticFields),
    kiTypeCountsSection(kiTypeCounts, dreams),
    tagCountsSection(tagCounts),
    includeMemory ? memorySection(aiIndex, target, factTypeCounts) : [],
    exampleQueriesSection(aiIndex.dest, includeMemory, dreams),
  ]);
};
