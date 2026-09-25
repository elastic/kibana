/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MEMORY_KI_TYPES } from '../../common/memory';

export interface AiIndexExampleQuery {
  title: string;
  /** ES|QL with `?name` parameters; the caller supplies `params`. */
  esql: string;
}

const KEEP = '| KEEP title, description, content, type, tags';
export const EXCLUDE_MEMORY_KI_TYPES_FILTER = `| WHERE type IS NULL OR (${MEMORY_KI_TYPES.map(
  (type) => `type != "${type}"`
).join(' AND ')})`;

/**
 * Three fixed ES|QL shapes for the canonical KI schema (`title`, `description`, `content`, their
 * `.semantic` multi-fields, `type`, `tags`); only the `FROM` target changes. Memory exclusion is
 * optional so a disabled global feature does not expose memory-specific instructions. Indices with
 * other mappings need the field names adapted.
 */
export const buildExampleQueries = (
  target: string,
  { excludeMemory = false }: { excludeMemory?: boolean } = {}
): AiIndexExampleQuery[] => [
  {
    title: 'Full text search, lexical and semantic fused together (?query)',
    esql: [
      `FROM ${target} METADATA _id, _index, _score`,
      ...(excludeMemory ? [EXCLUDE_MEMORY_KI_TYPES_FILTER] : []),
      '| FORK',
      '    ( WHERE MATCH(title, ?query) OR MATCH(description, ?query) OR MATCH(content, ?query) | SORT _score DESC | LIMIT 20 )',
      '    ( WHERE MATCH(title.semantic, ?query) OR MATCH(description.semantic, ?query) OR MATCH(content.semantic, ?query) | SORT _score DESC | LIMIT 20 )',
      '| FUSE',
      '| SORT _score DESC, _id ASC',
      KEEP,
      '| LIMIT 5',
    ].join('\n'),
  },
  {
    title: 'Filter by knowledge item type and tag (?type, ?tag; tags is multi-valued, so MATCH)',
    esql: [
      `FROM ${target}`,
      ...(excludeMemory ? [EXCLUDE_MEMORY_KI_TYPES_FILTER] : []),
      '| WHERE type == ?type AND MATCH(tags, ?tag)',
      KEEP,
      '| LIMIT 20',
    ].join('\n'),
  },
  {
    title: 'Count by type',
    esql: [
      `FROM ${target}`,
      ...(excludeMemory ? [EXCLUDE_MEMORY_KI_TYPES_FILTER] : []),
      '| STATS count = COUNT(*) BY type',
      '| SORT count DESC',
      '| LIMIT 20',
    ].join('\n'),
  },
];
