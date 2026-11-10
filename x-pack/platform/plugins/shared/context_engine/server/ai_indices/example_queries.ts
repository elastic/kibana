/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexDest } from '../../common/http_api/ai_indices';
import { kiLifecyclePipeline } from './ki_lifecycle';
import { MEMORY_KI_TYPES } from '../../common/memory';
import { ENTITY_TYPE_PREFIX, FACT_TYPE_PREFIX, PROCEDURE_TYPE_PREFIX } from '../../common/dreaming';

export interface AiIndexExampleQuery {
  title: string;
  /** ES|QL with `?name` parameters; the caller supplies `params`. */
  esql: string;
}

const KEEP = '| KEEP title, description, content, type, tags';
export const FACT_TYPE_PATTERN = `${FACT_TYPE_PREFIX}*`;
export const ENTITY_TYPE_PATTERN = `${ENTITY_TYPE_PREFIX}*`;
export const PROCEDURE_TYPE_PATTERN = `${PROCEDURE_TYPE_PREFIX}*`;

/** Leaves out memory types and, when the AI index dreams, the KI types dreaming writes. */
export const excludeMemoryKiTypesCondition = (dreams: boolean): string =>
  `type IS NULL OR (${[
    ...MEMORY_KI_TYPES.map((type) => `type != "${type}"`),
    ...(dreams ? [FACT_TYPE_PATTERN, ENTITY_TYPE_PATTERN, PROCEDURE_TYPE_PATTERN] : []).map(
      (pattern) => `NOT type LIKE "${pattern}"`
    ),
  ].join(' AND ')})`;

export const excludeMemoryKiTypesFilter = (dreams: boolean): string =>
  `| WHERE ${excludeMemoryKiTypesCondition(dreams)}`;

/**
 * Three fixed ES|QL shapes for the canonical KI schema (`title`, `description`, `content`, their
 * `.semantic` multi-fields, `type`, `tags`), each opening with the lifecycle pipeline for the dest
 * type. Memory exclusion is optional so a disabled global feature does not expose memory-specific
 * instructions. Indices with other mappings need the field names adapted.
 */
export const buildExampleQueries = (
  { type, value }: AiIndexDest,
  { excludeMemory = false, dreams = false }: { excludeMemory?: boolean; dreams?: boolean } = {}
): AiIndexExampleQuery[] => {
  const from = [
    `FROM ${value} METADATA _id, _index, _score`,
    ...kiLifecyclePipeline(type).map((command) => `| ${command}`),
    ...(excludeMemory ? [excludeMemoryKiTypesFilter(dreams)] : []),
  ];
  return [
    {
      title: 'Full text search, lexical and semantic fused together (?query)',
      esql: [
        ...from,
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
      esql: [...from, '| WHERE type == ?type AND MATCH(tags, ?tag)', KEEP, '| LIMIT 20'].join('\n'),
    },
    {
      title: 'Count by type',
      esql: [...from, '| STATS count = COUNT(*) BY type', '| SORT count DESC', '| LIMIT 20'].join(
        '\n'
      ),
    },
  ];
};
