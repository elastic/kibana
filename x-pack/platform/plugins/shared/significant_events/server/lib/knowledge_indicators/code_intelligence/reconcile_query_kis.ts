/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { uniq } from 'lodash';
import type { QueryLink } from '@kbn/significant-events-schema';
import type { KnowledgeIndicatorClient, KIBulkOperation } from '../knowledge_indicator_client';
import { queryFromLink } from '../knowledge_indicator_client/serializers';
import { KI_TYPE_QUERY } from '../fields';

/**
 * A merge action: enrich `canonical` with the unioned evidence/severity of the
 * cluster, and tombstone the `duplicateIds`.
 */
export interface QueryMerge {
  canonical: QueryLink;
  mergedEvidence: string[];
  mergedSeverity?: number;
  duplicateIds: string[];
  /** True when the merged evidence spans both code and log sources. */
  corroborated: boolean;
}

export interface QueryReconcilePlan {
  merges: QueryMerge[];
}

/**
 * Stricter score floor for reconciliation than the recall-tuned
 * `semantic_min_score` search default (0.15). NOTE: the semantic rank query
 * minmax-normalizes `_score` over the retrieved set, so this floor is
 * defense-in-depth only — the top hit always scores ~1.0 regardless of
 * absolute similarity. The structural-signature gate below is the real guard
 * against merging non-duplicates.
 */
export const RECONCILE_MIN_SCORE = 0.8;

const CODE_EVIDENCE_PREFIX = 'code:';

const hasCodeEvidence = (evidence: string[] = []): boolean =>
  evidence.some((line) => line.trimStart().startsWith(CODE_EVIDENCE_PREFIX));

const hasLogEvidence = (evidence: string[] = []): boolean =>
  evidence.some((line) => !line.trimStart().startsWith(CODE_EVIDENCE_PREFIX));

const ESQL_KEYWORDS = new Set([
  'and',
  'or',
  'not',
  'null',
  'true',
  'false',
  'like',
  'rlike',
  'in',
  'is',
  'by',
  'asc',
  'desc',
]);

const FIELD_COMPARISON_RE =
  /([a-zA-Z_@][\w.]*)\s*(?:==|!=|>=|<=|>|<|\bIS\s+(?:NOT\s+)?NULL\b|\bLIKE\b|\bRLIKE\b|\bIN\s*\()/gi;
const MATCH_FN_RE = /\b(?:MATCH|MATCH_PHRASE|MATCH_OPERATOR|QSTR|KQL)\s*\(\s*([a-zA-Z_@][\w.]*)/gi;
const BY_CLAUSE_RE = /\bBY\s+((?:[a-zA-Z_@][\w.]*\s*,\s*)*[a-zA-Z_@][\w.]*)/gi;

/**
 * Deterministic structural signature of an ES|QL query: the sorted source
 * set (FROM …) plus the sorted set of field names it filters or groups on.
 * Two queries are only merge candidates when their signatures are equal —
 * semantically-near queries over DIFFERENT fields (e.g. `status.code` vs
 * `exception.type`) are distinct indicators, not duplicates, no matter how
 * similar their titles read.
 */
export function esqlStructuralSignature(esqlText: string): string {
  const text = esqlText.replace(/\s+/g, ' ').trim();

  const fromMatch = text.match(/^\s*FROM\s+([^|]+)/i);
  const sources = fromMatch
    ? fromMatch[1]
        .replace(/\bMETADATA\b.*$/i, '')
        .split(',')
        .map((source) => source.trim().toLowerCase())
        .filter(Boolean)
        .sort()
    : [];

  const fields = new Set<string>();
  const addField = (raw: string) => {
    const field = raw.toLowerCase();
    if (!ESQL_KEYWORDS.has(field)) {
      fields.add(field);
    }
  };
  for (const match of text.matchAll(FIELD_COMPARISON_RE)) {
    addField(match[1]);
  }
  for (const match of text.matchAll(MATCH_FN_RE)) {
    addField(match[1]);
  }
  for (const match of text.matchAll(BY_CLAUSE_RE)) {
    for (const field of match[1].split(',')) {
      addField(field.trim());
    }
  }

  return JSON.stringify({ sources, fields: [...fields].sort() });
}

/** Connected components over an undirected adjacency map. */
export function computeClusters(ids: string[], adjacency: Map<string, Set<string>>): string[][] {
  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const start of ids) {
    if (visited.has(start)) {
      continue;
    }
    const cluster: string[] = [];
    const stack = [start];
    visited.add(start);
    while (stack.length > 0) {
      const node = stack.pop()!;
      cluster.push(node);
      for (const neighbor of adjacency.get(node) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push(neighbor);
        }
      }
    }
    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Chooses the surviving query for a cluster: prefer a rule-backed query (it has
 * a live rule), then the highest severity, then the most recently updated, then
 * a stable id tie-break.
 */
export function pickCanonical(cluster: QueryLink[]): QueryLink {
  return [...cluster].sort((a, b) => {
    if (a.rule_backed !== b.rule_backed) {
      return a.rule_backed ? -1 : 1;
    }
    const severity = (b.query.severity_score ?? 0) - (a.query.severity_score ?? 0);
    if (severity !== 0) {
      return severity;
    }
    const updated = (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
    if (updated !== 0) {
      return updated;
    }
    return a.query.id.localeCompare(b.query.id);
  })[0];
}

/**
 * Builds a merge plan from query links + a semantic adjacency map. Each cluster
 * of >1 becomes a single canonical query carrying the unioned evidence of all
 * members; the rest are tombstoned. Clusters with more than one rule-backed
 * query are skipped (ambiguous — never auto-delete a live rule).
 */
export function buildQueryReconcilePlan(
  links: QueryLink[],
  adjacency: Map<string, Set<string>>,
  logger?: Logger
): QueryReconcilePlan {
  const byId = new Map(links.map((link) => [link.query.id, link]));
  const clusters = computeClusters(
    links.map((link) => link.query.id),
    adjacency
  );

  const merges: QueryMerge[] = [];

  for (const clusterIds of clusters) {
    if (clusterIds.length < 2) {
      continue;
    }
    const cluster = clusterIds.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));

    const ruleBackedCount = cluster.filter((link) => link.rule_backed).length;
    if (ruleBackedCount > 1) {
      logger?.debug(
        `reconcile_queries: skipping cluster with ${ruleBackedCount} rule-backed queries (ambiguous): ${clusterIds.join(
          ', '
        )}`
      );
      continue;
    }

    const canonical = pickCanonical(cluster);
    const duplicates = cluster.filter((link) => link.query.id !== canonical.query.id);

    // Safety: never tombstone a rule-backed query. (pickCanonical prefers the
    // rule-backed one, so this should not happen, but guard anyway.)
    if (duplicates.some((link) => link.rule_backed)) {
      logger?.debug(
        `reconcile_queries: skipping cluster to avoid deleting a rule-backed duplicate: ${clusterIds.join(
          ', '
        )}`
      );
      continue;
    }

    const allEvidence = cluster.flatMap((link) => link.query.evidence ?? []);
    const mergedEvidence = uniq([...(canonical.query.evidence ?? []), ...allEvidence]);
    const mergedSeverity = cluster.reduce<number | undefined>((max, link) => {
      const score = link.query.severity_score;
      if (score === undefined) return max;
      return max === undefined ? score : Math.max(max, score);
    }, canonical.query.severity_score);

    merges.push({
      canonical,
      mergedEvidence,
      mergedSeverity,
      duplicateIds: duplicates.map((link) => link.query.id),
      corroborated: hasCodeEvidence(mergedEvidence) && hasLogEvidence(mergedEvidence),
    });
  }

  return { merges };
}

/** Turns a merge plan into KI bulk operations (canonical re-index + tombstones). */
export function toReconcileOperations(plan: QueryReconcilePlan): KIBulkOperation[] {
  const operations: KIBulkOperation[] = [];
  for (const merge of plan.merges) {
    operations.push({
      index: {
        query: {
          ...queryFromLink(merge.canonical),
          evidence: merge.mergedEvidence,
          severity_score: merge.mergedSeverity,
          rule_backed: merge.canonical.rule_backed,
          rule_id: merge.canonical.rule_id,
        },
      },
    });
    for (const id of merge.duplicateIds) {
      operations.push({ delete: { type: KI_TYPE_QUERY, id } });
    }
  }
  return operations;
}

export interface ReconcileQueriesResult {
  clustersMerged: number;
  queriesTombstoned: number;
  corroborated: number;
}

/**
 * Standalone cross-source reconciler for Query KIs. Finds semantically
 * equivalent queries (regardless of source or ES|QL phrasing) via the KI
 * `search_embedding`, and merges each duplicate cluster into one canonical
 * query that carries both code and log evidence. Idempotent: once a cluster is
 * merged, a re-run finds nothing further to do.
 */
export async function reconcileCodeAndLogQueries({
  streamName,
  kiClient,
  logger,
}: {
  streamName: string;
  kiClient: KnowledgeIndicatorClient;
  logger: Logger;
}): Promise<ReconcileQueriesResult> {
  const { [streamName]: links } = await kiClient.getStreamToQueryLinksMap([streamName]);
  if (links.length < 2) {
    return { clustersMerged: 0, queriesTombstoned: 0, corroborated: 0 };
  }

  const byId = new Map(links.map((link) => [link.query.id, link]));
  const signatureById = new Map(
    links.map((link) => [link.query.id, esqlStructuralSignature(link.query.esql.query)])
  );

  // Directed nearest-neighbor sets from semantic search over the KI embedding,
  // with a stricter score floor than the recall-tuned search default.
  const neighbors = new Map<string, Set<string>>();
  for (const link of links) {
    const text = `${link.query.title}\n${link.query.description ?? ''}`;
    const matches = await kiClient.findQueries(
      streamName,
      text,
      { ruleUnbacked: 'include', minScore: RECONCILE_MIN_SCORE },
      'semantic'
    );
    neighbors.set(
      link.query.id,
      new Set(
        matches.map((match) => match.query.id).filter((id) => id !== link.query.id && byId.has(id))
      )
    );
  }

  // Keep only mutual matches — both queries must retrieve each other — AND
  // require an identical ES|QL structural signature. Semantic similarity is
  // minmax-normalized (relative), so near-neighbor titles alone must never
  // drive a delete; duplicates must also target the same sources and fields.
  const adjacency = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a)!.add(b);
  };
  for (const [id, set] of neighbors) {
    for (const other of set) {
      if (!neighbors.get(other)?.has(id)) {
        continue;
      }
      if (signatureById.get(id) !== signatureById.get(other)) {
        logger.debug(
          `reconcile_queries: skipping semantic pair with different ES|QL structure: ${id} vs ${other}`
        );
        continue;
      }
      addEdge(id, other);
      addEdge(other, id);
    }
  }

  const plan = buildQueryReconcilePlan(links, adjacency, logger);
  if (plan.merges.length === 0) {
    return { clustersMerged: 0, queriesTombstoned: 0, corroborated: 0 };
  }

  // Audit trail: record exactly what is about to be merged away, BEFORE the
  // bulk executes, so a destructive merge is never silent.
  for (const merge of plan.merges) {
    const tombstoned = merge.duplicateIds
      .map((id) => {
        const dup = byId.get(id);
        return dup ? `${id} "${dup.query.title}"` : id;
      })
      .join(', ');
    logger.info(
      `reconcile_queries: merging into "${merge.canonical.query.title}" (${merge.canonical.query.id}) on stream "${streamName}"; tombstoning: ${tombstoned}`
    );
  }

  const operations = toReconcileOperations(plan);
  await kiClient.bulk(streamName, operations);

  const queriesTombstoned = plan.merges.reduce((sum, merge) => sum + merge.duplicateIds.length, 0);
  const corroborated = plan.merges.filter((merge) => merge.corroborated).length;

  logger.debug(
    `reconcile_queries: merged ${plan.merges.length} cluster(s), tombstoned ${queriesTombstoned} duplicate(s) on stream "${streamName}"`
  );

  return { clustersMerged: plan.merges.length, queriesTombstoned, corroborated };
}
