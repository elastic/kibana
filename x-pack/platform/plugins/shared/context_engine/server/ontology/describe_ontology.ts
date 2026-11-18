/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { AiIndexDest, KiTypeCount } from '../../common/http_api/ai_indices';
import {
  ONTOLOGY_CONNECTOR_ACCESS_PATTERNS_ATTRIBUTE,
  ONTOLOGY_DATASET_KI_TYPE,
  ONTOLOGY_ENTITY_TYPE_ATTRIBUTE,
  ONTOLOGY_FIELDS_ATTRIBUTE,
  ONTOLOGY_SYNONYMS_ATTRIBUTE,
  ONTOLOGY_TERM_KI_TYPE,
  isOntologyKiType,
} from '../../common/ontology';
import { accessPatternsOf } from '../dreaming/access_patterns';
import type { DreamedKi } from '../dreaming/dreamed_ki';
import { readOntologyKis, stringsOf } from './existing';

/** Ontology entries the describe block lists. */
export const MAX_DESCRIBED_ONTOLOGY_KIS = 30;
const MAX_LISTED_VALUES = 5;

const listed = (values: string[]): string =>
  values.length > MAX_LISTED_VALUES
    ? `${values.slice(0, MAX_LISTED_VALUES).join(', ')}, …`
    : values.join(', ');

const exampleOf = (ki: DreamedKi): string | undefined => {
  const [pattern] = accessPatternsOf(ki);
  if (pattern) {
    return pattern.esql_example;
  }
  const [call] = stringsOf(ki.attributes?.[ONTOLOGY_CONNECTOR_ACCESS_PATTERNS_ATTRIBUTE]);
  if (!call) {
    return undefined;
  }
  try {
    const {
      connector_id: connectorId,
      sub_action: subAction,
      params_example: params,
    } = JSON.parse(call) as { connector_id?: string; sub_action?: string; params_example?: string };
    return `execute_connector_sub_action {"connectorId":"${connectorId}","subAction":"${subAction}","params":${params}}`;
  } catch {
    return undefined;
  }
};

const lineOf = (ki: DreamedKi): string => {
  if (ki.type === ONTOLOGY_DATASET_KI_TYPE) {
    const example = exampleOf(ki);
    return [
      `dataset ${ki.title}${ki.description ? `: ${ki.description}` : ''}`,
      ...(example ? [`  Example: ${example}`] : []),
    ].join('\n');
  }
  const synonyms = stringsOf(ki.attributes?.[ONTOLOGY_SYNONYMS_ATTRIBUTE]);
  const fields = stringsOf(ki.attributes?.[ONTOLOGY_FIELDS_ATTRIBUTE]);
  const entityType = ki.attributes?.[ONTOLOGY_ENTITY_TYPE_ATTRIBUTE];
  return `${typeof entityType === 'string' ? `entity type ${entityType}` : `term ${ki.title}`}${
    synonyms.length > 0 ? ` (also ${listed(synonyms)})` : ''
  }${fields.length > 0 ? `: ${listed(fields)}` : ''}`;
};

/** Datasets first, then the configured entity types, then terms discovered while onboarding. */
const rank = (ki: DreamedKi): number =>
  ki.type === ONTOLOGY_DATASET_KI_TYPE
    ? 0
    : typeof ki.attributes?.[ONTOLOGY_ENTITY_TYPE_ATTRIBUTE] === 'string'
    ? 1
    : 2;

/**
 * The ontology section of the describe block: the datasets and terms ontology discovery found.
 * Empty, without a query, when the type counts show no ontology KI.
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
    ({ type }) => type === ONTOLOGY_DATASET_KI_TYPE || type === ONTOLOGY_TERM_KI_TYPE
  );
  if (kis.length === 0) {
    return [];
  }
  const sorted = [...kis].sort(
    (a, b) => rank(a) - rank(b) || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0)
  );
  const shown = sorted.slice(0, MAX_DESCRIBED_ONTOLOGY_KIS);
  return [
    `Ontology (the datasets the sources read and the business terms they store${
      sorted.length > shown.length ? `; showing ${shown.length} of ${sorted.length}` : ''
    })`,
    ...shown.map(lineOf),
    'Read an entry for its full description and access patterns: filter KIs by type ontology.dataset or ontology.term.',
  ];
};
