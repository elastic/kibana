/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MemoryExampleQueries {
  crossSession: string;
  currentConversation: string;
}

/** ES|QL examples for recalling current memory revisions from an AI-index backing target. */
export const buildMemoryExampleQueries = (target: string): MemoryExampleQueries => ({
  crossSession: [
    `FROM ${target} METADATA _id, _index, _score`,
    '| WHERE type == "memory.session_fact"',
    '| INLINE STATS latest_at = MAX(@timestamp) BY id',
    '| WHERE @timestamp == latest_at',
    '  AND (governance.lifecycle.status IS NULL OR governance.lifecycle.status != "deleted")',
    '  AND (expires_at IS NULL OR expires_at > NOW())',
    '| FORK',
    '    ( WHERE content:"<query>" OR title:"<query>" OR description:"<query>" | SORT _score DESC | LIMIT 20 )',
    '    ( WHERE content.semantic:"<query>" OR title.semantic:"<query>" OR description.semantic:"<query>" | SORT _score DESC | LIMIT 20 )',
    '| FUSE',
    '| SORT _score DESC, _id ASC',
    '| KEEP id, title, description, content, type, tags, updated_at, references.uri, references.relation, references.description',
    '| LIMIT 10',
  ].join('\n'),
  currentConversation: [
    `FROM ${target}`,
    '| WHERE type IN ("memory.session", "memory.session_fact")',
    '| INLINE STATS latest_at = MAX(@timestamp) BY id',
    '| WHERE @timestamp == latest_at',
    '  AND (governance.lifecycle.status IS NULL OR governance.lifecycle.status != "deleted")',
    '  AND (expires_at IS NULL OR expires_at > NOW())',
    '| EVAL session_id = FIELD_EXTRACT(attributes, "memory.session_id")',
    '| WHERE session_id == "<conversation-id>"',
    '| SORT updated_at DESC, id ASC',
    '| LIMIT 10',
    '| SORT updated_at ASC, id ASC',
    '| KEEP id, title, description, content, type, tags, updated_at, references.uri, references.relation, references.description',
  ].join('\n'),
});
