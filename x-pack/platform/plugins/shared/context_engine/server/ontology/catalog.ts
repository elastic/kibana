/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexItem } from '../../common/http_api/ai_indices';
import {
  MAX_ONTOLOGY_DATASETS,
  MAX_ONTOLOGY_FIELDS,
  MAX_PROFILED_KEYWORD_FIELDS,
  MAX_PROFILED_NUMERIC_FIELDS,
  MAX_TOP_VALUE_CARDINALITY,
  MAX_TOP_VALUE_FIELDS,
  MAX_TOP_VALUE_LENGTH,
  ONTOLOGY_DATASET_KI_TYPE,
  ONTOLOGY_FINGERPRINT_ATTRIBUTE,
  ONTOLOGY_INDEX_ATTRIBUTE,
  ONTOLOGY_PROFILED_AT_ATTRIBUTE,
  ONTOLOGY_PROFILE_WINDOW_DAYS,
  ONTOLOGY_TOP_VALUES,
  isSensitiveField,
  type ResolvedOntologyConfig,
} from '../../common/ontology';
import type {
  CatalogOntologySourcesOutput,
  OntologyCatalogEntry,
  OntologyDatasetProfile,
} from '../../common/step_types/catalog_ontology_sources';
import { parseIntervalMinutes } from '../../common/validation';
import { describeAiIndexFields } from '../ai_indices/describe_fields';
import { baseContent } from '../dreaming/access_patterns';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { shortHash } from '../dreaming/ids';
import { formatErrorMessage } from '../utils/format_es_error';
import { fromSourcesOf, quoteField, quoteSource, runEsql, firstRow } from './esql';
import { otherDatasetsOf, readOntologyKis, sourceIdsOf, toExistingOntologyKi } from './existing';
import { datasetKiId, ontologySourceId } from './ids';

const CONTAINER_FIELD_TYPES: ReadonlySet<string> = new Set(['object', 'nested']);
const DATE_FIELD_TYPES: ReadonlySet<string> = new Set(['date', 'date_nanos']);
const KEYWORD_LIKE_FIELD_TYPES: ReadonlySet<string> = new Set([
  'keyword',
  'constant_keyword',
  'boolean',
  'ip',
  'version',
]);
const NUMERIC_FIELD_TYPES: ReadonlySet<string> = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'double',
  'float',
  'half_float',
  'scaled_float',
  'unsigned_long',
]);
const MAX_ERROR_LENGTH = 500;
const MINUTE_MS = 60 * 1000;

type CatalogField = OntologyCatalogEntry['fields'][number];
type ProfileField = OntologyDatasetProfile['fields'][number];
type ProfileValue = string | number | boolean | null;

const errorOf = (label: string, error: unknown): string =>
  `${label}: ${formatErrorMessage(error)}`.slice(0, MAX_ERROR_LENGTH);

const toProfileValue = (value: unknown): ProfileValue | undefined => {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return value.length > MAX_TOP_VALUE_LENGTH ? `${value.slice(0, MAX_TOP_VALUE_LENGTH)}…` : value;
  }
  return undefined;
};

const isHiddenOrSystem = (attributes: readonly string[] | undefined): boolean =>
  (attributes ?? []).some((attribute) => attribute === 'hidden' || attribute === 'system');

/** The indices, data streams and aliases one `FROM` reads. Backing indices of data streams are left out. */
const resolveDatasets = async (
  esClient: ElasticsearchClient,
  targets: string[],
  abortSignal?: AbortSignal
): Promise<Map<string, OntologyCatalogEntry['kind']>> => {
  const response = await esClient.indices.resolveIndex(
    { name: targets, expand_wildcards: 'open', ignore_unavailable: true, allow_no_indices: true },
    { signal: abortSignal }
  );
  const datasets = new Map<string, OntologyCatalogEntry['kind']>();
  for (const { name } of response.data_streams ?? []) {
    datasets.set(name, 'data_stream');
  }
  for (const { name } of response.aliases ?? []) {
    datasets.set(name, 'alias');
  }
  for (const { name, data_stream: dataStream, attributes } of response.indices ?? []) {
    if (dataStream === undefined && !isHiddenOrSystem(attributes)) {
      datasets.set(name, 'index');
    }
  }
  return datasets;
};

const readCatalogFields = async (
  esClient: ElasticsearchClient,
  name: string
): Promise<{ fields: CatalogField[]; omitted: number }> => {
  const { allFields } = await describeAiIndexFields({ esClient, target: name });
  const leaves = allFields.filter(({ type }) => !CONTAINER_FIELD_TYPES.has(type));
  return {
    fields: leaves
      .slice(0, MAX_ONTOLOGY_FIELDS)
      .map(({ path, type, searchable, aggregatable }) => ({
        name: path,
        type,
        searchable,
        aggregatable,
      })),
    omitted: Math.max(0, leaves.length - MAX_ONTOLOGY_FIELDS),
  };
};

/** A hash of the field names and types: equal when the mapping did not change. */
export const fingerprintOf = (fields: readonly CatalogField[]): string =>
  shortHash(...fields.map(({ name, type }) => `${name}:${type}`).sort());

const timeFieldOf = (fields: readonly CatalogField[]): string | undefined =>
  fields.find(({ name, type }) => name === '@timestamp' && DATE_FIELD_TYPES.has(type))?.name ??
  fields.find(({ type }) => DATE_FIELD_TYPES.has(type))?.name;

const isOlderThan = (date: unknown, minutes: number, now: Date): boolean =>
  typeof date !== 'string' ||
  Number.isNaN(Date.parse(date)) ||
  now.getTime() - Date.parse(date) >= minutes * MINUTE_MS;

const REASON_ORDER: Record<OntologyDatasetProfile['reason'], number> = {
  new: 0,
  mapping_changed: 1,
  refresh: 2,
};

interface Candidate {
  entry: OntologyCatalogEntry;
  omittedFields: number;
  id: string;
  fingerprint: string;
  reason: OntologyDatasetProfile['reason'];
  profiledAt: number;
  current?: DreamedKi;
}

/** Profiles one dataset with ES|QL. A query that fails is reported in `errors`; the rest still run. */
export const profileDataset = async ({
  esClient,
  candidate: { entry, omittedFields, id, fingerprint, reason, current },
  valueSamples,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  candidate: Candidate;
  valueSamples: boolean;
  abortSignal?: AbortSignal;
}): Promise<OntologyDatasetProfile> => {
  const from = `FROM ${quoteSource(entry.name)}`;
  const timeField = timeFieldOf(entry.fields);
  const window = timeField
    ? ` | WHERE ${quoteField(timeField)} >= NOW() - ${ONTOLOGY_PROFILE_WINDOW_DAYS} days`
    : '';
  const errors: string[] = [];
  const stats = new Map<string, Omit<ProfileField, 'name' | 'type'>>();
  const statsOf = (name: string) => {
    const existing = stats.get(name) ?? {};
    stats.set(name, existing);
    return existing;
  };
  const profile: Pick<OntologyDatasetProfile, 'row_count' | 'earliest' | 'latest'> = {};

  try {
    const row = firstRow(
      await runEsql(
        esClient,
        `${from} | STATS row_count = COUNT(*)${
          timeField
            ? `, earliest = MIN(${quoteField(timeField)}), latest = MAX(${quoteField(timeField)})`
            : ''
        }`,
        abortSignal
      )
    );
    if (typeof row.row_count === 'number') {
      profile.row_count = row.row_count;
    }
    const earliest = toProfileValue(row.earliest);
    const latest = toProfileValue(row.latest);
    if (earliest !== undefined) profile.earliest = earliest;
    if (latest !== undefined) profile.latest = latest;
  } catch (error) {
    errors.push(errorOf('row count', error));
  }

  const keywordFields = entry.fields
    .filter(({ type, aggregatable }) => aggregatable && KEYWORD_LIKE_FIELD_TYPES.has(type))
    .slice(0, MAX_PROFILED_KEYWORD_FIELDS);
  if (keywordFields.length > 0) {
    try {
      const row = firstRow(
        await runEsql(
          esClient,
          `${from}${window} | STATS ${keywordFields
            .map(({ name }, index) => `d${index} = COUNT_DISTINCT(${quoteField(name)})`)
            .join(', ')}`,
          abortSignal
        )
      );
      keywordFields.forEach(({ name }, index) => {
        const distinct = row[`d${index}`];
        if (typeof distinct === 'number') {
          statsOf(name).distinct = distinct;
        }
      });
    } catch (error) {
      errors.push(errorOf('distinct counts', error));
    }
  }

  if (valueSamples) {
    const sampled = keywordFields
      .filter(({ name, type }) => {
        const distinct = stats.get(name)?.distinct;
        return (
          type !== 'ip' &&
          !isSensitiveField(name) &&
          distinct !== undefined &&
          distinct > 0 &&
          distinct <= MAX_TOP_VALUE_CARDINALITY
        );
      })
      .slice(0, MAX_TOP_VALUE_FIELDS);
    for (const { name } of sampled) {
      try {
        const { columns, rows } = await runEsql(
          esClient,
          `${from}${window} | WHERE ${quoteField(
            name
          )} IS NOT NULL | STATS count = COUNT(*) BY ${quoteField(
            name
          )} | SORT count DESC | LIMIT ${ONTOLOGY_TOP_VALUES}`,
          abortSignal
        );
        const countColumn = columns.indexOf('count');
        const valueColumn = columns.findIndex((column) => column !== 'count');
        statsOf(name).top_values = rows.flatMap((row) => {
          const value = toProfileValue(row[valueColumn]);
          const count = row[countColumn];
          return value !== undefined && typeof count === 'number' ? [{ value, count }] : [];
        });
      } catch (error) {
        errors.push(errorOf(`top values of ${name}`, error));
      }
    }
  }

  const numericFields = entry.fields
    .filter(({ type, aggregatable }) => aggregatable && NUMERIC_FIELD_TYPES.has(type))
    .slice(0, MAX_PROFILED_NUMERIC_FIELDS);
  if (numericFields.length > 0) {
    try {
      const row = firstRow(
        await runEsql(
          esClient,
          `${from}${window} | STATS ${numericFields
            .map(({ name }, index) => {
              const field = quoteField(name);
              return `n${index}_min = MIN(${field}), n${index}_max = MAX(${field}), n${index}_avg = AVG(${field})`;
            })
            .join(', ')}`,
          abortSignal
        )
      );
      numericFields.forEach(({ name }, index) => {
        const fieldStats = statsOf(name);
        for (const key of ['min', 'max', 'avg'] as const) {
          const value = toProfileValue(row[`n${index}_${key}`]);
          if (value !== undefined && value !== null) {
            fieldStats[key] = value;
          }
        }
      });
    } catch (error) {
      errors.push(errorOf('numeric ranges', error));
    }
  }

  const currentContent = baseContent(current?.content);
  return {
    name: entry.name,
    kind: entry.kind,
    id,
    fingerprint,
    reason,
    ...(timeField !== undefined && { time_field: timeField }),
    ...profile,
    fields: entry.fields.map(({ name, type }) => ({ name, type, ...stats.get(name) })),
    omitted_fields: omittedFields,
    ...(current && {
      current: {
        ...(current.description !== undefined && { description: current.description }),
        ...(currentContent !== undefined && { content: currentContent }),
      },
    }),
    errors,
  };
};

const emptyCatalog = (
  source: CatalogOntologySourcesOutput['source']
): CatalogOntologySourcesOutput => ({
  datasets: [],
  catalog: [],
  others: [],
  skipped: [],
  stale: [],
  existing: [],
  source,
});

/**
 * Catalogs the datasets one ES|QL source of an AI index reads, and profiles the ones to describe
 * this run. Reads as the given client's user; writes nothing.
 */
export const catalogOntologySources = async ({
  esClient,
  aiIndex,
  sourceId,
  spaceId,
  config,
  maxDatasets,
  now = new Date(),
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  aiIndex: AiIndexItem;
  sourceId: string;
  spaceId: string;
  config: ResolvedOntologyConfig;
  maxDatasets: number;
  now?: Date;
  abortSignal?: AbortSignal;
}): Promise<CatalogOntologySourcesOutput> => {
  const source = aiIndex.sources.find(
    (candidate) => candidate.type === 'esql' && ontologySourceId(candidate) === sourceId
  );
  if (!source) {
    return emptyCatalog({
      id: sourceId,
      type: 'esql',
      value: '',
      datasets: 0,
      error: 'The AI index has no such ES|QL source any more.',
    });
  }
  const { value } = source;
  const targets = fromSourcesOf(value);
  if (targets.length === 0) {
    return emptyCatalog({
      id: sourceId,
      type: 'esql',
      value,
      datasets: 0,
      error: 'The source query has no FROM to read.',
    });
  }
  let resolved: Map<string, OntologyCatalogEntry['kind']>;
  try {
    resolved = await resolveDatasets(esClient, targets, abortSignal);
  } catch (error) {
    return emptyCatalog({
      id: sourceId,
      type: 'esql',
      value,
      datasets: 0,
      error: formatErrorMessage(error),
    });
  }

  const skipped: CatalogOntologySourcesOutput['skipped'] = [];
  let fieldsFailed = false;
  const names = [...resolved.keys()].sort();
  for (const name of names.slice(MAX_ONTOLOGY_DATASETS)) {
    skipped.push({ name, reason: `over the cap of ${MAX_ONTOLOGY_DATASETS} datasets` });
  }
  const catalog: OntologyCatalogEntry[] = [];
  const omittedFields = new Map<string, number>();
  for (const name of names.slice(0, MAX_ONTOLOGY_DATASETS)) {
    const kind = resolved.get(name);
    if (!kind) {
      continue;
    }
    try {
      const { fields, omitted } = await readCatalogFields(esClient, name);
      catalog.push({ name, kind, source_ids: [sourceId], fields });
      omittedFields.set(name, omitted);
    } catch (error) {
      fieldsFailed = true;
      skipped.push({ name, reason: errorOf('reading its fields failed', error) });
    }
  }

  const existingKis = await readOntologyKis({
    esClient,
    dest: aiIndex.dest,
    spaceId,
    abortSignal,
  });
  const byId = new Map(existingKis.map((ki) => [ki.id, ki]));
  const refreshMinutes = parseIntervalMinutes(config.refreshInterval) ?? Infinity;

  const candidates: Candidate[] = [];
  for (const entry of catalog) {
    const id = datasetKiId(entry.name);
    const current = byId.get(id);
    const fingerprint = fingerprintOf(entry.fields);
    const profiledAt = current?.attributes?.[ONTOLOGY_PROFILED_AT_ATTRIBUTE];
    const reason: Candidate['reason'] | undefined = !current
      ? 'new'
      : current.attributes?.[ONTOLOGY_FINGERPRINT_ATTRIBUTE] !== fingerprint
      ? 'mapping_changed'
      : isOlderThan(profiledAt, refreshMinutes, now) || !sourceIdsOf(current).includes(sourceId)
      ? 'refresh'
      : undefined;
    if (!reason) {
      skipped.push({ name: entry.name, reason: 'unchanged' });
      continue;
    }
    candidates.push({
      entry,
      omittedFields: omittedFields.get(entry.name) ?? 0,
      id,
      fingerprint,
      reason,
      profiledAt: typeof profiledAt === 'string' ? Date.parse(profiledAt) || 0 : 0,
      ...(current && { current }),
    });
  }
  candidates.sort(
    (a, b) =>
      REASON_ORDER[a.reason] - REASON_ORDER[b.reason] ||
      a.profiledAt - b.profiledAt ||
      (a.entry.name < b.entry.name ? -1 : 1)
  );
  for (const { entry } of candidates.slice(maxDatasets)) {
    skipped.push({ name: entry.name, reason: 'deferred to a later run' });
  }

  const datasets: OntologyDatasetProfile[] = [];
  for (const candidate of candidates.slice(0, maxDatasets)) {
    datasets.push(
      await profileDataset({
        esClient,
        candidate,
        valueSamples: config.valueSamples,
        abortSignal,
      })
    );
  }

  const stale = fieldsFailed
    ? []
    : existingKis
        .filter((ki) => {
          const index = ki.attributes?.[ONTOLOGY_INDEX_ATTRIBUTE];
          return (
            ki.type === ONTOLOGY_DATASET_KI_TYPE &&
            typeof index === 'string' &&
            !resolved.has(index) &&
            sourceIdsOf(ki).includes(sourceId)
          );
        })
        .map(({ id }) => id);

  return {
    datasets,
    catalog,
    others: otherDatasetsOf(existingKis, new Set(resolved.keys())),
    skipped,
    stale,
    existing: existingKis.map(toExistingOntologyKi),
    source: { id: sourceId, type: 'esql', value, datasets: resolved.size },
  };
};
