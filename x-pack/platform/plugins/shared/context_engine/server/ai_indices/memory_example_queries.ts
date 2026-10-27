/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MemoryExampleQueries {
  crossSession: string;
  entityLookup: string;
  relationships: string;
}

const CURRENT_REVISION = [
  '| INLINE STATS latest_at = MAX(@timestamp) BY id',
  '| WHERE @timestamp == latest_at',
  '  AND (governance.lifecycle.status IS NULL OR governance.lifecycle.status == "active")',
  '  AND (expires_at IS NULL OR expires_at > NOW())',
];

/** ES|QL examples for recalling current memory revisions from an AI-index backing target. */
export const buildMemoryExampleQueries = (target: string): MemoryExampleQueries => ({
  crossSession: [
    `FROM ${target} METADATA _id, _index, _score`,
    '| WHERE type == "memory.session_fact"',
    ...CURRENT_REVISION,
    '| FORK',
    '    ( WHERE content:"<query>" OR title:"<query>" OR description:"<query>" | SORT _score DESC | LIMIT 20 )',
    '    ( WHERE content.semantic:"<query>" OR title.semantic:"<query>" OR description.semantic:"<query>" | SORT _score DESC | LIMIT 20 )',
    '| FUSE',
    '| SORT _score DESC, _id ASC',
    '| KEEP id, title, description, content, type, tags, updated_at, references.uri, references.relation, references.description',
    '| LIMIT 10',
  ].join('\n'),
  entityLookup: [
    `FROM ${target} METADATA _id, _index, _score`,
    '| WHERE type LIKE "memory.entity.*" OR type LIKE "memory.fact.*"',
    ...CURRENT_REVISION,
    '| WHERE MATCH(title, ?query) OR MATCH(content, ?query)',
    '| SORT _score DESC',
    '| KEEP id, type, title, description, content, references.uri',
    '| LIMIT 10',
  ].join('\n'),
  relationships: [
    `FROM ${target} METADATA _id, _index`,
    // references.uri is multi-valued, so MATCH rather than ==.
    '| WHERE type LIKE "memory.relationship.*" AND MATCH(references.uri, ?uri)',
    ...CURRENT_REVISION,
    '| KEEP id, type, title, description, references.uri',
    '| LIMIT 50',
  ].join('\n'),
});
