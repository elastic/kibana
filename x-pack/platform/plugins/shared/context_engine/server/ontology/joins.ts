/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import {
  MAX_ONTOLOGY_JOIN_CANDIDATES,
  MIN_ONTOLOGY_JOIN_OVERLAP,
  MIN_ONTOLOGY_JOIN_SAMPLE,
  ONTOLOGY_JOIN_SAMPLE_SIZE,
} from '../../common/ontology';
import type { OntologyCatalogEntry } from '../../common/step_types/catalog_ontology_sources';
import {
  ontologyJoinCandidateSchema,
  type OntologyJoinCandidate,
  type VerifyOntologyJoinsOutput,
} from '../../common/step_types/verify_ontology_joins';
import { formatErrorMessage } from '../utils/format_es_error';
import { quoteField, quoteSource, runEsql } from './esql';

const KEYWORD_TYPES: ReadonlySet<string> = new Set(['keyword', 'constant_keyword', 'wildcard']);
const INTEGER_TYPES: ReadonlySet<string> = new Set([
  'long',
  'integer',
  'short',
  'byte',
  'unsigned_long',
]);

/** The family of field types whose values can be compared, or none for a type joins don't use. */
const joinFamilyOf = (type: string): string | undefined => {
  if (KEYWORD_TYPES.has(type)) return 'keyword';
  if (type === 'double') return undefined;
  if (INTEGER_TYPES.has(type)) return 'integer';
  if (type === 'ip') return 'ip';
  return undefined;
};

const labelOf = ({
  from_dataset: a,
  from_field: f,
  to_dataset: b,
  to_field: g,
}: OntologyJoinCandidate) => `${a}.${f} = ${b}.${g}`;

const keyOf = (candidate: OntologyJoinCandidate): string => {
  const ends = [
    `${candidate.from_dataset}\u0000${candidate.from_field}`,
    `${candidate.to_dataset}\u0000${candidate.to_field}`,
  ].sort();
  return ends.join('\u0001');
};

const swap = ({
  from_dataset: fromDataset,
  from_field: fromField,
  to_dataset: toDataset,
  to_field: toField,
}: OntologyJoinCandidate): OntologyJoinCandidate => ({
  from_dataset: toDataset,
  from_field: toField,
  to_dataset: fromDataset,
  to_field: fromField,
});

/** Up to {@link ONTOLOGY_JOIN_SAMPLE_SIZE} distinct values of the from field of an index dataset. */
const sampleValues = async (
  esClient: ElasticsearchClient,
  { from_dataset: dataset, from_field: name }: OntologyJoinCandidate,
  abortSignal?: AbortSignal
): Promise<Array<string | number>> => {
  const field = quoteField(name);
  const { rows } = await runEsql(
    esClient,
    `FROM ${quoteSource(
      dataset
    )} | WHERE ${field} IS NOT NULL | STATS BY ${field} | LIMIT ${ONTOLOGY_JOIN_SAMPLE_SIZE}`,
    abortSignal
  );
  return rows
    .map(([value]) => value)
    .filter(
      (value): value is string | number => typeof value === 'string' || typeof value === 'number'
    );
};

/** How many of the sampled values the dataset's field holds. */
const countMatches = async (
  esClient: ElasticsearchClient,
  { to_dataset: dataset, to_field: field }: OntologyJoinCandidate,
  values: Array<string | number>,
  abortSignal?: AbortSignal
): Promise<number> => {
  const response = await esClient.search(
    {
      index: dataset,
      ignore_unavailable: true,
      allow_no_indices: true,
      size: 0,
      query: { terms: { [field]: values } },
      aggs: {
        matched: { cardinality: { field, precision_threshold: ONTOLOGY_JOIN_SAMPLE_SIZE * 2 } },
      },
    },
    { signal: abortSignal }
  );
  const matched = (response.aggregations?.matched as { value?: number } | undefined)?.value;
  return Math.min(typeof matched === 'number' ? matched : 0, values.length);
};

/**
 * Keeps the join candidates whose fields hold the same values: at least
 * {@link MIN_ONTOLOGY_JOIN_OVERLAP} of up to {@link ONTOLOGY_JOIN_SAMPLE_SIZE} distinct `from`
 * values must be in the `to` field. A connector side is checked with the values its samples hold.
 */
export const verifyOntologyJoins = async ({
  esClient,
  catalog,
  candidates,
  abortSignal,
}: {
  esClient: ElasticsearchClient;
  catalog: readonly OntologyCatalogEntry[];
  candidates: readonly unknown[];
  abortSignal?: AbortSignal;
}): Promise<VerifyOntologyJoinsOutput> => {
  const datasets = new Map(catalog.map((entry) => [entry.name, entry]));
  const verified: VerifyOntologyJoinsOutput['verified'] = [];
  const rejected: VerifyOntologyJoinsOutput['rejected'] = [];
  const seen = new Set<string>();
  let checked = 0;

  for (const raw of candidates) {
    const parsed = ontologyJoinCandidateSchema.safeParse(raw);
    if (!parsed.success) {
      rejected.push({ candidate: JSON.stringify(raw).slice(0, 200), reason: 'malformed' });
      continue;
    }
    const proposed = parsed.data;
    const reject = (reason: string) => rejected.push({ candidate: labelOf(proposed), reason });
    if (seen.has(keyOf(proposed))) {
      reject('listed twice');
      continue;
    }
    seen.add(keyOf(proposed));
    if (proposed.from_dataset === proposed.to_dataset) {
      reject('joins a dataset to itself');
      continue;
    }
    const fromEntry = datasets.get(proposed.from_dataset);
    const toEntry = datasets.get(proposed.to_dataset);
    if (fromEntry?.kind === 'connector' && toEntry?.kind === 'connector') {
      reject('cannot check a join between two connectors');
      continue;
    }
    // A connector cannot be searched by value: its sampled values are checked against the index.
    const candidate = toEntry?.kind === 'connector' ? swap(proposed) : proposed;
    const fromField = datasets
      .get(candidate.from_dataset)
      ?.fields.find(({ name }) => name === candidate.from_field);
    const toField = datasets
      .get(candidate.to_dataset)
      ?.fields.find(({ name }) => name === candidate.to_field);
    if (!fromField || !toField) {
      reject('names a dataset or field that is not in the catalog');
      continue;
    }
    const family = joinFamilyOf(fromField.type);
    if (!family || family !== joinFamilyOf(toField.type)) {
      reject(`cannot join a ${fromField.type} field to a ${toField.type} field`);
      continue;
    }
    const fromConnector = datasets.get(candidate.from_dataset)?.kind === 'connector';
    if (
      (!fromConnector && !fromField.aggregatable) ||
      !toField.searchable ||
      !toField.aggregatable
    ) {
      reject('a field is not searchable and aggregatable');
      continue;
    }
    if (checked >= MAX_ONTOLOGY_JOIN_CANDIDATES) {
      reject(`over the cap of ${MAX_ONTOLOGY_JOIN_CANDIDATES} candidates`);
      continue;
    }
    checked++;

    try {
      const values = fromConnector
        ? fromField.sample_values ?? []
        : await sampleValues(esClient, candidate, abortSignal);
      if (values.length < (fromConnector ? MIN_ONTOLOGY_JOIN_SAMPLE : 1)) {
        reject(
          fromConnector
            ? `fewer than ${MIN_ONTOLOGY_JOIN_SAMPLE} sampled values to check`
            : 'the from field holds no values'
        );
        continue;
      }
      const matched = await countMatches(esClient, candidate, values, abortSignal);
      const overlap = Math.round((matched / values.length) * 1000) / 1000;
      if (overlap < MIN_ONTOLOGY_JOIN_OVERLAP) {
        reject(`only ${Math.round(overlap * 100)}% of ${values.length} sampled values match`);
        continue;
      }
      verified.push({ ...candidate, overlap, sampled: values.length });
    } catch (error) {
      reject(`checking it failed: ${formatErrorMessage(error)}`.slice(0, 500));
    }
  }

  return { verified, rejected };
};
