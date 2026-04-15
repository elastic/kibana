/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { MappingField } from '../utils/mappings';
import { executeEsql } from '../utils/esql';

export interface TopSnippetsConfig {
  /** Maximum number of snippets per document. */
  numSnippets: number;
  /** Maximum number of words per snippet. */
  numWords: number;
}

/**
 * Escapes a string for safe embedding inside an ES|QL double-quoted string
 * literal. Backslashes and double-quotes are the two characters that need
 * escaping inside `"…"` literals.
 */
const escapeEsqlString = (value: string): string => {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
};

/**
 * Builds the ES|QL expression that merges all searchable field values into
 * a single multi-valued field using MV_APPEND.  When there is only one field,
 * no wrapping is needed.
 *
 * Example for three fields: `MV_APPEND(MV_APPEND(field_a, field_b), field_c)`
 */
const buildMvAppendExpression = (fields: MappingField[]): string => {
  if (fields.length === 1) {
    return `\`${fields[0].path}\``;
  }
  return fields.reduce((expr, field, idx) => {
    const escaped = `\`${field.path}\``;
    return idx === 0 ? escaped : `MV_APPEND(${expr}, ${escaped})`;
  }, '');
};

/**
 * Extracts top snippets for a batch of documents in a single ES|QL call.
 *
 * The query merges all searchable text fields into one multi-valued field
 * via MV_APPEND, deduplicates with MV_DEDUPE, then applies TOP_SNIPPETS
 * to extract the most relevant fragments.
 *
 * Returns a Map from document ID to an array of unique snippet strings,
 * preserving the order returned by ES|QL (best-matching first).
 */
export const extractSnippetsBatch = async ({
  index,
  docIds,
  term,
  fields,
  config,
  esClient,
  logger,
}: {
  index: string;
  docIds: string[];
  term: string;
  fields: MappingField[];
  config: TopSnippetsConfig;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<Map<string, string[]>> => {
  if (docIds.length === 0 || fields.length === 0) {
    return new Map();
  }

  const escapedTerm = escapeEsqlString(term);
  const idList = docIds.map((id) => `"${escapeEsqlString(id)}"`).join(', ');
  const mvAppendExpr = buildMvAppendExpression(fields);

  const escapedIndex = index.includes(' ') ? `\`${index}\`` : index;

  const query = [
    `FROM ${escapedIndex} METADATA _id`,
    `| WHERE _id IN (${idList})`,
    `| EVAL doc = MV_DEDUPE(${mvAppendExpr})`,
    `| EVAL snippets = TOP_SNIPPETS(doc, "${escapedTerm}", {"num_snippets": ${config.numSnippets}, "num_words": ${config.numWords}})`,
    `| MV_EXPAND snippets`,
    `| KEEP _id, snippets`,
  ].join('\n');

  logger.debug(`TOP_SNIPPETS ES|QL query:\n${query}`);

  try {
    const response = await executeEsql({ query, esClient });

    const idColIdx = response.columns.findIndex((col) => col.name === '_id');
    const snippetColIdx = response.columns.findIndex((col) => col.name === 'snippets');

    if (idColIdx === -1 || snippetColIdx === -1) {
      logger.debug(
        `TOP_SNIPPETS response missing expected columns. Columns: ${JSON.stringify(
          response.columns.map((c) => c.name)
        )}`
      );
      return new Map();
    }

    const snippetSets = new Map<string, Set<string>>();

    for (const row of response.values) {
      const docId = row[idColIdx] as string;
      const snippet = row[snippetColIdx] as string | null;

      if (docId == null || snippet == null) {
        continue;
      }

      const existing = snippetSets.get(docId);
      if (existing) {
        existing.add(snippet);
      } else {
        snippetSets.set(docId, new Set([snippet]));
      }
    }

    const snippetsByDocId = new Map<string, string[]>();
    for (const [docId, snippets] of snippetSets) {
      snippetsByDocId.set(docId, [...snippets]);
    }

    return snippetsByDocId;
  } catch (error) {
    logger.debug(
      `TOP_SNIPPETS extraction failed for index="${index}", term="${term}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
};
