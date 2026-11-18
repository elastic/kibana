/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest, KiTypeCount } from '../../common/http_api/ai_indices';
import {
  ONTOLOGY_DATASET_KI_TYPE,
  ONTOLOGY_FIELDS_ATTRIBUTE,
  ONTOLOGY_SYNONYMS_ATTRIBUTE,
  isOntologyKiType,
} from '../../common/ontology';
import { accessPatternsOf } from '../dreaming/access_patterns';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { ontologyStatusOf, readOntologyKis } from './existing';

/** Ontology entries the describe block lists. */
export const MAX_DESCRIBED_ONTOLOGY_KIS = 30;
const MAX_LISTED_VALUES = 5;

const stringsOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : typeof value === 'string'
    ? [value]
    : [];

const listed = (values: string[]): string =>
  values.length > MAX_LISTED_VALUES
    ? `${values.slice(0, MAX_LISTED_VALUES).join(', ')}, …`
    : values.join(', ');

const lineOf = (ki: DreamedKi): string => {
  const status = ontologyStatusOf(ki);
  if (ki.type === ONTOLOGY_DATASET_KI_TYPE) {
    const [pattern] = accessPatternsOf(ki);
    return [
      `[${status}] dataset ${ki.title}${ki.description ? `: ${ki.description}` : ''}`,
      ...(pattern ? [`  Example: ${pattern.esql_example}`] : []),
    ].join('\n');
  }
  const synonyms = stringsOf(ki.attributes?.[ONTOLOGY_SYNONYMS_ATTRIBUTE]);
  const fields = stringsOf(ki.attributes?.[ONTOLOGY_FIELDS_ATTRIBUTE]);
  return `[${status}] term ${ki.title}${synonyms.length > 0 ? ` (also ${listed(synonyms)})` : ''}${
    fields.length > 0 ? `: ${listed(fields)}` : ''
  }`;
};

const rank = (ki: DreamedKi): number =>
  (ontologyStatusOf(ki) === 'certified' ? 0 : 2) + (ki.type === ONTOLOGY_DATASET_KI_TYPE ? 0 : 1);

/**
 * The ontology section of the describe block: the datasets and terms ontology discovery found,
 * certified first. Empty, without a query, when the type counts show no ontology KI.
 */
export const describeOntology = async ({
  esClient,
  dest,
  spaceId,
  kiTypeCounts,
}: {
  esClient: ElasticsearchClient;
  dest: AiIndexDest;
  spaceId: string;
  kiTypeCounts: readonly KiTypeCount[];
}): Promise<string[]> => {
  if (!kiTypeCounts.some(({ type, count }) => count > 0 && isOntologyKiType(type))) {
    return [];
  }
  const kis = (await readOntologyKis({ esClient, dest, spaceId })).filter(
    ({ type }) => type !== 'memory.relationship'
  );
  if (kis.length === 0) {
    return [];
  }
  const sorted = [...kis].sort(
    (a, b) => rank(a) - rank(b) || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0)
  );
  const shown = sorted.slice(0, MAX_DESCRIBED_ONTOLOGY_KIS);
  return [
    `Ontology (datasets and business terms discovered from the ES|QL sources; certified entries were reviewed by a person${
      sorted.length > shown.length ? `; showing ${shown.length} of ${sorted.length}` : ''
    })`,
    ...shown.map(lineOf),
    'Read an entry for its full description and access patterns: filter KIs by type ontology.dataset or ontology.term.',
  ];
};
