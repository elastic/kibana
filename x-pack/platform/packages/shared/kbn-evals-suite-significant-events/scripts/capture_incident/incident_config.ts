/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import path from 'path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { z } from '@kbn/zod';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { INCIDENT_AUTO_GCS_FOLDER } from './constants';

const timeRangeSchema = z.object({
  gte: z.string().min(1),
  lt: z.string().min(1),
});

/**
 * A single Query DSL query object, e.g. `{ query_string: { query: '…' } }`,
 * `{ term: { … } }`, or `{ bool: { filter: [ … ] } }`. Both `symptom` and
 * `snapshot` are plain Query DSL — the remote `_reindex` accepts Query DSL only
 * (not ES|QL). Each incident writes whatever DSL query fits; `{}` means "no filter".
 */
const queryDslSchema = z.record(z.string(), z.unknown());

export type QueryDsl = z.infer<typeof queryDslSchema>;

const incidentConfigSchema = z.object({
  incident: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    date: z.string().min(1),
    slackChannel: z.string().optional(),
  }),
  source: z.object({
    host: z.string().url(),
    apiKey: z.string().optional(),
    // One index pattern or a list of them. May be plain (`serverless.logs-*`),
    // CCS-prefixed (`logging-us-east-1:logs-elasticsearch.server-*`), non-`logs-*`
    // (`logging-*:cluster-kibana-*`), broad (`logs-*`), or a mix of local + remote.
    index: z.union([z.string().min(1), z.array(z.string().min(1)).nonempty()]),
    // Patterns to exclude from `index` (e.g. `logs-elasticsearch.gc-*` to drop a
    // huge/unreadable dataset). Compiled to `-pattern` exclusions in the reindex
    // source. Useful when `index` is a broad wildcard like `logs-*`.
    exclude: z.array(z.string().min(1)).optional(),
    // Provenance only (stored in metadata). May be a wildcard (`logging-*`) or omitted.
    cluster: z.string().optional(),
  }),
  query: z.object({
    timeRange: timeRangeSchema,
    // The narrow, symptom-only Query DSL query used to LOCATE and CONFIRM the
    // incident. NOT snapshotted; it is stored so it can be replayed against the
    // restored index to isolate the error lines. A plain DSL query, same as `snapshot`.
    symptom: queryDslSchema.optional(),
    // The broad Query DSL query that is actually reindexed and snapshotted (noise
    // included). Remote `_reindex` accepts Query DSL only, not ES|QL. Omit it (or
    // `{}`) to capture the whole dataset within `timeRange`.
    snapshot: queryDslSchema.optional(),
  }),
  snapshot: z
    .object({
      // Symptom hit count confirmed by the ES|QL symptom probe (informational).
      expectedSymptomDocCount: z.number().int().nonnegative().optional(),
      // If set, the run fails when the reindexed count differs. This is the TOTAL
      // across all captured indices (one per source data stream).
      expectedDocCount: z.number().int().nonnegative().optional(),
      gcsBasePath: z.string().min(1).optional(),
      preserveProvenance: z.boolean().optional(),
    })
    .optional(),
});

export type IncidentConfig = z.infer<typeof incidentConfigSchema>;

export interface ResolvedIncidentConfig extends IncidentConfig {
  /** API key resolved from env (preferred) or the config's `source.apiKey`. */
  resolvedApiKey: string;
  /** GCS base path (from config or derived from the incident id). */
  gcsBasePath: string;
  /** Whether to preserve the original `_index` provenance during reindex. */
  preserveProvenance: boolean;
  /**
   * Reindex `source.index` value: the include patterns plus each `source.exclude`
   * pattern prefixed with `-` (ES index-expression exclusion).
   */
  sourceIndex: string[];
  /**
   * Nominal `_reindex` `dest.index`. The painless script routes every doc to its
   * original data-stream name, so this bucket should never receive documents; if
   * it does, it flags a routing gap.
   */
  unroutedIndex: string;
}

/**
 * Validates a plain object against the incident config schema, throwing a
 * readable error listing every failing field. Shared by the file loader and the
 * `--incident-id` auto-config path.
 */
export function validateIncidentConfig(
  parsed: unknown,
  source = 'incident config'
): IncidentConfig {
  const result = incidentConfigSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid ${source}:\n${issues}`);
  }
  return result.data;
}

/**
 * Loads a JSON or YAML incident config from disk and validates it. YAML is a
 * superset of JSON, so the `yaml` parser covers both formats.
 */
export function readIncidentConfig(configPath: string): IncidentConfig {
  const absolutePath = path.resolve(process.cwd(), configPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Config file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = parseYaml(raw);

  return validateIncidentConfig(parsed, `incident config "${absolutePath}"`);
}

/**
 * Serializes an incident config to commented YAML for provenance. The header
 * records that the file was generated from an incident id via Agent Builder, and
 * the query blocks are annotated the same way a hand-written config would be.
 */
export function buildIncidentConfigYaml(config: IncidentConfig): string {
  const body = stringifyYaml(config, { lineWidth: 0 });
  const header = [
    '# =============================================================================',
    `# Incident ${config.incident.id}: ${config.incident.title}`,
    `# Date: ${config.incident.date}`,
    '# -----------------------------------------------------------------------------',
    '# Auto-generated by `capture_incident_snapshot.js --incident-id` from the',
    '# platform-logging Agent Builder investigation, confirmed by a probe against the',
    '# Overview source cluster. Two queries, both plain Query DSL:',
    '#   - query.symptom : narrow query that confirms the incident (stored for replay).',
    '#   - query.snapshot: broad, entity-scoped slice that is reindexed & snapshotted',
    '#                     (noise included) so the incident can be reproduced.',
    '# =============================================================================',
    '',
  ].join('\n');
  return `${header}${body}`;
}

/**
 * Resolves runtime values that depend on the environment: the source API key
 * (env var preferred over inline config) and defaulted snapshot options.
 */
export function resolveIncidentConfig(config: IncidentConfig): ResolvedIncidentConfig {
  const resolvedApiKey = process.env.OVERVIEW_API_KEY || config.source.apiKey || '';
  if (!resolvedApiKey) {
    throw new Error(
      `Missing source API key. Set the OVERVIEW_API_KEY environment variable in secrets.env ` +
        `(preferred) or add "source.apiKey" to the config file.`
    );
  }

  const gcsBasePath =
    config.snapshot?.gcsBasePath ?? `${INCIDENT_AUTO_GCS_FOLDER}/incident-${config.incident.id}`;

  const includes = Array.isArray(config.source.index) ? config.source.index : [config.source.index];
  // Compile exclusions to ES index-expression form. For a CCS `<cluster>:<pattern>`
  // the `-` must go AFTER the `:` (`<cluster>:-<pattern>`); a leading `-<cluster>:`
  // is parsed as excluding the whole cluster and is rejected.
  const excludes = (config.source.exclude ?? []).map((pattern) => {
    const colon = pattern.indexOf(':');
    return colon >= 0
      ? `${pattern.slice(0, colon + 1)}-${pattern.slice(colon + 1)}`
      : `-${pattern}`;
  });
  const sourceIndex = [...includes, ...excludes];

  return {
    ...config,
    resolvedApiKey,
    gcsBasePath,
    preserveProvenance: config.snapshot?.preserveProvenance ?? true,
    sourceIndex,
    unroutedIndex: `incident-${config.incident.id}-unrouted`,
  };
}

/**
 * Resolves the broad "snapshot" filter that is actually reindexed and
 * snapshotted. Returning `undefined` means "capture everything in the time range"
 * (noise included), which is a valid choice for a full real-world slice.
 */
export function resolveSnapshotFilter(config: IncidentConfig): QueryDsl | undefined {
  return config.query.snapshot;
}

/** Resolves the narrow, symptom-only filter, if any. */
export function resolveSymptomFilter(config: IncidentConfig): QueryDsl | undefined {
  return config.query.symptom;
}

/**
 * Builds a `bool.filter` Query DSL container from the incident's time range plus
 * an optional Query DSL query. An empty (or absent) filter applies only the time
 * range.
 */
function buildFilterQuery(
  timeRange: { gte: string; lt: string },
  filter?: QueryDsl
): QueryDslQueryContainer {
  const clauses: QueryDslQueryContainer[] = [
    { range: { '@timestamp': { gte: timeRange.gte, lt: timeRange.lt } } },
  ];

  if (filter && Object.keys(filter).length > 0) {
    clauses.push(filter as QueryDslQueryContainer);
  }

  return { bool: { filter: clauses } };
}

/**
 * Builds the reindex source query — the broad "snapshot" slice over the incident's
 * time range. The scope is the entity "snapshot" filter UNION the "symptom" filter,
 * enforcing the invariant that the symptom is a SUBSET of the snapshot: every doc
 * the symptom matches is reindexed (and thus present after restore for replay),
 * even if it lives on an entity outside the snapshot scope. With no filters, only
 * the time range applies. Query DSL only (remote `_reindex` can't run ES|QL).
 */
export function buildSnapshotQuery(config: ResolvedIncidentConfig): QueryDslQueryContainer {
  const snapshot = resolveSnapshotFilter(config);
  const symptom = resolveSymptomFilter(config);
  const hasSnapshot = Boolean(snapshot && Object.keys(snapshot).length > 0);
  const hasSymptom = Boolean(symptom && Object.keys(symptom).length > 0);

  let scope: QueryDsl | undefined;
  if (hasSnapshot && hasSymptom) {
    scope = {
      bool: {
        should: [snapshot as QueryDslQueryContainer, symptom as QueryDslQueryContainer],
        minimum_should_match: 1,
      },
    };
  } else {
    scope = hasSnapshot ? snapshot : hasSymptom ? symptom : undefined;
  }

  return buildFilterQuery(config.query.timeRange, scope);
}

/**
 * Builds the narrow "symptom" query over the incident's time range. Returns
 * `undefined` when no symptom filter is configured. Not executed by this tool —
 * stored for provenance/replay against the restored index.
 */
export function buildSymptomQuery(
  config: ResolvedIncidentConfig
): QueryDslQueryContainer | undefined {
  const symptom = resolveSymptomFilter(config);
  if (!symptom || Object.keys(symptom).length === 0) {
    return undefined;
  }
  return buildFilterQuery(config.query.timeRange, symptom);
}
