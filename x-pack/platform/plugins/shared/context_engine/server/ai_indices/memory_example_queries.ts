/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENTITY_TYPE_PREFIX, FACT_TYPE_PREFIX, PROCEDURE_TYPE_PREFIX } from '../../common/dreaming';
import { ENTITY_TYPE_PATTERN, FACT_TYPE_PATTERN, PROCEDURE_TYPE_PATTERN } from './example_queries';

export interface MemoryExampleQueries {
  crossSession: string;
  factsOfType: string;
  recentFacts: string;
  entityByName: string;
  entitiesOfType: string;
  procedureForTask: string;
  proceduresOfType: string;
}

const latestActiveRevision = [
  '| INLINE STATS latest_at = MAX(@timestamp) BY id',
  '| WHERE @timestamp == latest_at',
  '  AND (governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active")',
  '  AND (expires_at IS NULL OR expires_at > NOW())',
];

const KEEP_WITH_REFERENCES =
  '| KEEP id, title, description, content, type, tags, updated_at, references.uri, references.relation, references.description';

const newestOfType = (target: string, typeFilter: string): string =>
  [
    `FROM ${target} METADATA _id`,
    `| WHERE ${typeFilter}`,
    ...latestActiveRevision,
    '| SORT updated_at DESC, _id ASC',
    KEEP_WITH_REFERENCES,
    '| LIMIT 20',
  ].join('\n');

const hybridSearch = (target: string, typeFilter: string, placeholder: string): string =>
  [
    `FROM ${target} METADATA _id, _index, _score`,
    `| WHERE ${typeFilter}`,
    ...latestActiveRevision,
    '| FORK',
    `    ( WHERE content:"${placeholder}" OR title:"${placeholder}" OR description:"${placeholder}" | SORT _score DESC | LIMIT 20 )`,
    `    ( WHERE content.semantic:"${placeholder}" OR title.semantic:"${placeholder}" OR description.semantic:"${placeholder}" | SORT _score DESC | LIMIT 20 )`,
    '| FUSE',
    '| SORT _score DESC, _id ASC',
    KEEP_WITH_REFERENCES,
    '| LIMIT 10',
  ].join('\n');

/** ES|QL examples for recalling current memory revisions from an AI-index backing target. */
export const buildMemoryExampleQueries = (
  target: string,
  { includeFacts = false }: { includeFacts?: boolean } = {}
): MemoryExampleQueries => ({
  crossSession: hybridSearch(
    target,
    includeFacts
      ? `type == "memory.session_fact" OR type LIKE "${FACT_TYPE_PATTERN}"`
      : 'type == "memory.session_fact"',
    '<query>'
  ),
  factsOfType: newestOfType(target, `type == "${FACT_TYPE_PREFIX}<fact type>"`),
  recentFacts: newestOfType(target, `type LIKE "${FACT_TYPE_PATTERN}"`),
  entityByName: [
    `FROM ${target} METADATA _id, _score`,
    `| WHERE type LIKE "${ENTITY_TYPE_PATTERN}"`,
    ...latestActiveRevision,
    '| WHERE title:"<name>"',
    '| SORT _score DESC, _id ASC',
    KEEP_WITH_REFERENCES,
    '| LIMIT 5',
  ].join('\n'),
  entitiesOfType: newestOfType(target, `type == "${ENTITY_TYPE_PREFIX}<entity type>"`),
  procedureForTask: hybridSearch(target, `type LIKE "${PROCEDURE_TYPE_PATTERN}"`, '<task>'),
  proceduresOfType: newestOfType(target, `type == "${PROCEDURE_TYPE_PREFIX}<procedure type>"`),
});
