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
import { isCcsTarget } from '../utils/ccs';

export interface MatchResult {
  id: string;
  index: string;
  snippets: string[];
}

export interface PerformMatchSearchResponse {
  results: MatchResult[];
}

// --- Search & extraction configuration ---

// When true, use ES|QL TOP_SNIPPETS command to generate snippets from the documents
// returned via the RRF retriever. When false, rely on Elasticsearch's highlighter to generate snippets.
const useSnippets = true;
// The maximum number of snippets to return for each matching document. The number of returned snippets
// may be lower than this depending on the content in the returned document.
// Only applicable when useSnippets = true.
const numSnippets = 2;
// The number of words to use when chunking fields for snippet generation.
// Only applicable when useSnippets = true.
const numWords = 750;

// The reranker inference ID to use. We assume this reranker is always available.
const rerankInferenceID = '.jina-reranker-v3';
// When true, perform RERANK on the documents that were returned via the RRF retriever.
const rerankCandidateDocs = true;
// When true, perform an additional rerank operation on the generated snippets for each document.
const rerankSnippets = true;

// Number of candidate documents to retrieve for doc reranking
const rankWindowSize = 20;
// Number of candidate snippets to extract per doc for snippet reranking
const snippetRankWindowSize = 10;

// --- End configuration ---

/**
 * Builds the search request body. For local indices, uses the RRF retriever
 * for best relevance ranking. For CCS targets, falls back to a query-based
 * approach because the simplified RRF retriever syntax does not support
 * cross-cluster index patterns.
 */
const buildSearchRequest = ({
  index,
  term,
  fields,
  size,
}: {
  index: string;
  term: string;
  fields: MappingField[];
  size: number;
}): Record<string, any> => {
  const requestSize = rerankCandidateDocs ? rankWindowSize : size;

  const highlightConfig = !useSnippets
    ? {
        highlight: {
          number_of_fragments: 5,
          fragment_size: 500,
          pre_tags: [''],
          post_tags: [''],
          order: 'score' as const,
          fields: fields.reduce((memo, field) => ({ ...memo, [field.path]: {} }), {}),
        },
      }
    : {};

  if (isCcsTarget(index)) {
    return {
      index,
      size: requestSize,
      query: buildCcsQuery({ term, fields }),
      ...highlightConfig,
    };
  }

  // Here is where we're using the RRF retriever for hybrid retrieval :)
  return {
    index,
    size: requestSize,
    retriever: {
      rrf: {
        rank_window_size: requestSize * 2,
        query: term,
        fields: fields.map((field) => field.path),
      },
    },
    ...highlightConfig,
  };
};

const buildCcsQuery = ({
  term,
  fields,
}: {
  term: string;
  fields: MappingField[];
}): Record<string, unknown> => {
  return {
    bool: {
      should: fields.map((f) => ({ match: { [f.path]: term } })),
      minimum_should_match: 1,
    },
  };
};

const escapeEsqlString = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildMvAppendExpr = (fieldPaths: string[]): string => {
  if (fieldPaths.length === 1) {
    return fieldPaths[0];
  }
  return fieldPaths.reduce((acc, path) => `MV_APPEND(${acc}, ${path})`);
};

const extractSnippetsBatch = async ({
  docIds,
  index,
  term,
  fields,
  esClient,
  logger,
}: {
  docIds: string[];
  index: string;
  term: string;
  fields: MappingField[];
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<Map<string, string[]>> => {
  const result = new Map<string, string[]>();
  if (docIds.length === 0) return result;

  const fieldPaths = fields.map((field) => field.path);
  const mvAppendExpr = buildMvAppendExpr(fieldPaths);

  const snippetCount = rerankSnippets ? snippetRankWindowSize : numSnippets;

  const idList = docIds.map((id) => `"${escapeEsqlString(id)}"`).join(', ');
  const escapedTerm = escapeEsqlString(term);

  const esqlQuery = `FROM ${index} METADATA _id | WHERE _id IN (${idList}) | EVAL doc = MV_DEDUPE(${mvAppendExpr}) | EVAL snippets = TOP_SNIPPETS(doc, "${escapedTerm}", {"num_snippets": ${snippetCount}, "num_words": ${numWords}}) | MV_EXPAND snippets | KEEP _id, snippets`;

  logger.info(`TOP_SNIPPETS batch query for ${docIds.length} docs: ${esqlQuery}`);

  const esqlResponse = await executeEsql({ query: esqlQuery, esClient });

  // Response columns are [_id, snippets]; group snippets by doc ID
  for (const row of esqlResponse.values) {
    const docId = row[0];
    const snippet = row[1];
    if (typeof docId !== 'string') continue;

    if (!result.has(docId)) {
      result.set(docId, []);
    }
    const snippets = result.get(docId)!;
    if (Array.isArray(snippet)) {
      for (const item of snippet) {
        if (typeof item === 'string') snippets.push(item);
      }
    } else if (typeof snippet === 'string') {
      snippets.push(snippet);
    }
  }

  return result;
};

const rerankDocuments = async ({
  docIds,
  index,
  term,
  fields,
  resultSize,
  esClient,
  logger,
}: {
  docIds: string[];
  index: string;
  term: string;
  fields: MappingField[];
  resultSize: number;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<string[]> => {
  logger.info(`rerankDocuments called with ${docIds.length} docs, resultSize=${resultSize}`);
  if (docIds.length === 0) return [];

  const fieldPaths = fields.map((f) => f.path);
  const mvAppendExpr = buildMvAppendExpr(fieldPaths);

  const idList = docIds.map((id) => `"${escapeEsqlString(id)}"`).join(', ');
  const escapedTerm = escapeEsqlString(term);

  const esqlQuery = `FROM ${index} METADATA _id | WHERE _id IN (${idList}) | EVAL rerank_input = MV_CONCAT(MV_DEDUPE(${mvAppendExpr}), " ") | RERANK "${escapedTerm}" ON rerank_input WITH {"inference_id": "${rerankInferenceID}"} | KEEP _id | LIMIT ${resultSize}`;

  logger.info(`RERANK candidate docs query: ${esqlQuery}`);

  const esqlResponse = await executeEsql({ query: esqlQuery, esClient });
  logger.info(`RERANK candidate docs response: ${JSON.stringify(esqlResponse)}`);

  return esqlResponse.values.map((row) => row[0]).filter((v): v is string => typeof v === 'string');
};

interface SnippetEntry {
  docId: string;
  snippet: string;
}

/**
 * Reranks all snippet entries across all documents in a single inference call,
 * then returns the top snippets per document.
 */
const rerankAllSnippets = async ({
  entriesByDocId,
  term,
  esClient,
  logger,
}: {
  entriesByDocId: Map<string, SnippetEntry[]>;
  term: string;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<Map<string, string[]>> => {
  const result = new Map<string, string[]>();

  // Flatten all entries into a single list, tracking the original index range per doc
  const allEntries: SnippetEntry[] = [];
  const docRanges: Array<{ docId: string; start: number; count: number }> = [];
  for (const [docId, entries] of entriesByDocId) {
    if (entries.length === 0) {
      result.set(docId, []);
      continue;
    }
    docRanges.push({ docId, start: allEntries.length, count: entries.length });
    allEntries.push(...entries);
  }

  if (allEntries.length === 0) return result;

  logger.info(
    `RERANK snippets: sending ${allEntries.length} snippets across ${docRanges.length} docs to inference API`
  );

  // NOTE: ES|QL RERANK doesn't play nicely with the format of the content in our test dataset,
  // so we're making a direct inference call to rerank snippets.
  const response = await esClient.inference.inference({
    inference_id: rerankInferenceID,
    task_type: 'rerank',
    query: term,
    input: allEntries.map((e) => e.snippet),
  });

  const reranked = (response as { rerank?: Array<{ index: number; relevance_score: number }> })
    .rerank;

  if (!reranked) {
    // Fallback: take first numSnippets per doc without reranking
    for (const { docId, start, count } of docRanges) {
      result.set(
        docId,
        allEntries
          .slice(start, start + count)
          .slice(0, numSnippets)
          .map((e) => e.snippet)
      );
    }
    return result;
  }

  // Build a set of scores indexed by original position for fast lookup
  const scoreByIndex = new Map<number, number>();
  for (const r of reranked) {
    scoreByIndex.set(r.index, r.relevance_score);
  }

  // For each doc, collect its scored snippets, sort by relevance, take top N
  for (const { docId, start, count } of docRanges) {
    const docScored: Array<{ snippet: string; score: number }> = [];
    for (let i = start; i < start + count; i++) {
      const score = scoreByIndex.get(i);
      if (score !== undefined) {
        docScored.push({ snippet: allEntries[i].snippet, score });
      }
    }
    docScored.sort((a, b) => b.score - a.score);
    const topSnippets = docScored.slice(0, numSnippets).map((s) => s.snippet);
    logger.info(
      `RERANK snippets for doc="${docId}": ${count} candidates -> ${topSnippets.length} returned`
    );
    result.set(docId, topSnippets);
  }

  return result;
};

export const performMatchSearch = async ({
  term,
  fields,
  index,
  size,
  esClient,
  logger,
}: {
  term: string;
  fields: MappingField[];
  index: string;
  size: number;
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<PerformMatchSearchResponse> => {
  const searchRequest = buildSearchRequest({ index, term, fields, size });

  logger.info(`Elasticsearch search request: ${JSON.stringify(searchRequest, null, 2)}`);

  let response;
  try {
    response = await esClient.search<Record<string, unknown>>(searchRequest);
  } catch (error) {
    logger.info(
      `Elasticsearch search failed for index="${index}", term="${term}": ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }

  let hitOrder = response.hits.hits.map((hit) => hit._id!);
  logger.info(
    `Search returned ${hitOrder.length} hits: [${hitOrder.join(
      ', '
    )}], rerankCandidateDocs=${rerankCandidateDocs}, useSnippets=${useSnippets}`
  );

  if (rerankCandidateDocs) {
    const originalOrder = hitOrder;
    logger.info(`Entering RERANK candidate docs block with ${hitOrder.length} docs`);
    try {
      hitOrder = await rerankDocuments({
        docIds: hitOrder,
        index,
        term,
        fields,
        resultSize: size,
        esClient,
        logger,
      });
      logger.info(
        `RERANK candidate docs: before=[${originalOrder.join(', ')}] after=[${hitOrder.join(', ')}]`
      );
    } catch (error) {
      logger.info(
        `RERANK candidate docs failed, keeping original order: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      hitOrder = hitOrder.slice(0, size);
    }
  }

  const hitsByDocId = new Map(response.hits.hits.map((hit) => [hit._id!, hit]));

  if (useSnippets) {
    let rawSnippetsByDocId = new Map<string, string[]>();
    try {
      rawSnippetsByDocId = await extractSnippetsBatch({
        docIds: hitOrder,
        index,
        term,
        fields,
        esClient,
        logger,
      });
    } catch (error) {
      logger.info(
        `TOP_SNIPPETS batch query failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Dedup snippets per document
    const dedupedByDocId = new Map<string, SnippetEntry[]>();
    for (const docId of hitOrder) {
      const rawSnippets = rawSnippetsByDocId.get(docId) ?? [];
      const seen = new Set<string>();
      const uniqueSnippets = rawSnippets.filter((s) => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      });
      dedupedByDocId.set(
        docId,
        uniqueSnippets.map((s) => ({ docId, snippet: s }))
      );
    }

    // Rerank all snippets across all docs in a single inference call
    let snippetsByDocId: Map<string, string[]>;
    if (rerankSnippets) {
      try {
        snippetsByDocId = await rerankAllSnippets({
          entriesByDocId: dedupedByDocId,
          term,
          esClient,
          logger,
        });
      } catch (error) {
        logger.info(
          `RERANK snippets failed, keeping original order: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        snippetsByDocId = new Map<string, string[]>();
        for (const [docId, entries] of dedupedByDocId) {
          snippetsByDocId.set(
            docId,
            entries.slice(0, numSnippets).map((e) => e.snippet)
          );
        }
      }
    } else {
      snippetsByDocId = new Map<string, string[]>();
      for (const [docId, entries] of dedupedByDocId) {
        snippetsByDocId.set(
          docId,
          entries.map((e) => e.snippet)
        );
      }
    }

    const results: MatchResult[] = hitOrder.map((docId) => ({
      id: docId,
      index: hitsByDocId.get(docId)?._index ?? index,
      snippets: snippetsByDocId.get(docId) ?? [],
    }));

    return { results };
  }

  const results: MatchResult[] = hitOrder.map((docId) => {
    const hit = hitsByDocId.get(docId);
    return {
      id: docId,
      index: hit?._index ?? index,
      snippets: Object.values(hit?.highlight ?? {}).reduce<string[]>((acc, fragments) => {
        acc.push(...fragments);
        return acc;
      }, []),
    };
  });

  return { results };
};
