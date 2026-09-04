/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_AI_INDEX_SUGGESTED_QUERY_FIELDS } from '../../common/constants';
import type { AiIndexField, AiIndexSuggestedQueries } from '../../common/http_api/ai_indices';
import { KI_TYPE_FIELD } from './describe_aggregations';
import { KI_ATTRIBUTES_FIELD } from './describe_templates';
import { quoteIdentifier, quoteStringLiteral } from './esql_quote';
import { KEYWORD_TYPES, TEXT_TYPES, findUsableField, isUsableField } from './field_types';

const KEEP_FIELDS = ['title', 'description', 'content', KI_TYPE_FIELD, 'tags'];
const BRANCH_LIMIT = 20;
const RESULT_LIMIT = 10;

export interface BuildSuggestedQueriesParams {
  target: string;
  fields: AiIndexField[];
  semanticFields: string[];
  /** Most common KI type; drives `scoped_hybrid_search`. */
  topType?: string;
}

const searchablePaths = (fields: AiIndexField[], types: ReadonlySet<string>): string[] =>
  fields
    .filter((field) => field.searchable && isUsableField(field) && types.has(field.type))
    .map(({ path }) => path)
    .slice(0, MAX_AI_INDEX_SUGGESTED_QUERY_FIELDS);

const matchAny = (paths: string[]): string =>
  paths.map((path) => `MATCH(${quoteIdentifier(path)}, ?query)`).join(' OR ');

const keepClause = (paths: string[]): string[] =>
  paths.length > 0 ? [`| KEEP ${paths.map(quoteIdentifier).join(', ')}`] : [];

const hybrid = (bm25: string[], semantic: string[]): string[] => [
  '| FORK',
  `    ( WHERE ${matchAny(bm25)} | SORT _score DESC | LIMIT ${BRANCH_LIMIT} )`,
  `    ( WHERE ${matchAny(semantic)} | SORT _score DESC | LIMIT ${BRANCH_LIMIT} )`,
  '| FUSE',
  '| SORT _score DESC, _id ASC',
];

/** Ready-to-run ES|QL from real field metadata; conflicting fields are never referenced. */
export const buildSuggestedQueries = ({
  target,
  fields,
  semanticFields,
  topType,
}: BuildSuggestedQueriesParams): AiIndexSuggestedQueries => {
  const textPaths = searchablePaths(fields, TEXT_TYPES);
  // Keyword `MATCH` is exact-term: a fallback, not a peer of analyzed text.
  const bm25 = textPaths.length > 0 ? textPaths : searchablePaths(fields, KEYWORD_TYPES);
  const semantic = semanticFields.slice(0, MAX_AI_INDEX_SUGGESTED_QUERY_FIELDS);
  const present = (candidates: string[]) =>
    candidates.filter((path) => findUsableField(fields, path));

  const head = [`FROM ${target} METADATA _id, _index, _score`];
  const tail = [...keepClause(present(KEEP_FIELDS)), `| LIMIT ${RESULT_LIMIT}`];
  const query = (...parts: string[][]) => parts.flat().join('\n');

  const canHybrid = bm25.length > 0 && semantic.length > 0;
  const scope =
    topType === undefined
      ? []
      : [`| WHERE ${quoteIdentifier(KI_TYPE_FIELD)} == ${quoteStringLiteral(topType)}`];
  const canScope =
    canHybrid && scope.length > 0 && findUsableField(fields, KI_TYPE_FIELD) !== undefined;

  return {
    ...(canHybrid && { hybrid_search: query(head, hybrid(bm25, semantic), tail) }),
    ...(bm25.length > 0 && {
      keyword_search: query(
        head,
        [`| WHERE ${matchAny(bm25)}`, '| SORT _score DESC, _id ASC'],
        tail
      ),
    }),
    ...(canScope && { scoped_hybrid_search: query(head, scope, hybrid(bm25, semantic), tail) }),
    ...(findUsableField(fields, KI_ATTRIBUTES_FIELD, 'flattened') !== undefined && {
      extract_esql_attribute: query([
        `FROM ${target}`,
        `| EVAL esql = FIELD_EXTRACT(${quoteIdentifier(KI_ATTRIBUTES_FIELD)}, "esql")`,
        '| WHERE esql IS NOT NULL',
        `| KEEP ${[...present(['title', 'description']).map(quoteIdentifier), 'esql'].join(', ')}`,
        `| LIMIT ${RESULT_LIMIT}`,
      ]),
    }),
  };
};
