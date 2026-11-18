/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AiIndexDreamingConfig } from './dreaming';

/** Type prefix of the KIs ontology discovery writes. */
export const ONTOLOGY_TYPE_PREFIX = 'ontology.';
/** One index, data stream or alias an ES|QL source reads, or one connector source. */
export const ONTOLOGY_DATASET_KI_TYPE = 'ontology.dataset';
/** A business concept, such as Customer, stored in the fields of one or more datasets. */
export const ONTOLOGY_TERM_KI_TYPE = 'ontology.term';

export const isOntologyKiType = (type: string): boolean => type.startsWith(ONTOLOGY_TYPE_PREFIX);

/** The index expression, or `connector:<id>`, a dataset KI describes. */
export const ONTOLOGY_INDEX_ATTRIBUTE = 'ontology.index';
/** `index`, `data_stream`, `alias` or `connector`. */
export const ONTOLOGY_KIND_ATTRIBUTE = 'ontology.kind';
/** A hash of what was described: field names and types, or a connector's read sub-actions. */
export const ONTOLOGY_FINGERPRINT_ATTRIBUTE = 'ontology.fingerprint';
/** When the dataset was last profiled. */
export const ONTOLOGY_PROFILED_AT_ATTRIBUTE = 'ontology.profiled_at';
export const ONTOLOGY_TIME_FIELD_ATTRIBUTE = 'ontology.time_field';
export const ONTOLOGY_ROW_COUNT_ATTRIBUTE = 'ontology.row_count';
/** On an index dataset: `<field>:<type>` of each field another dataset can join to. */
export const ONTOLOGY_JOIN_FIELDS_ATTRIBUTE = 'ontology.join_fields';
/** On a connector dataset: the connector it reads. */
export const ONTOLOGY_CONNECTOR_ID_ATTRIBUTE = 'ontology.connector_id';
/** On a connector dataset or term: its access patterns, as JSON, run through the connector. */
export const ONTOLOGY_CONNECTOR_ACCESS_PATTERNS_ATTRIBUTE = 'ontology.connector_access_patterns';
/** Other names of a term, such as `client` for Customer. */
export const ONTOLOGY_SYNONYMS_ATTRIBUTE = 'ontology.synonyms';
/** Where a term is stored, as `<dataset>:<field>`. */
export const ONTOLOGY_FIELDS_ATTRIBUTE = 'ontology.fields';
/** On a term: the configured entity type it is, when the dreaming config has entity types. */
export const ONTOLOGY_ENTITY_TYPE_ATTRIBUTE = 'ontology.entity_type';
/** On a term of an entity type: `<attribute>=<dataset>:<field>` for each attribute a field holds. */
export const ONTOLOGY_ATTRIBUTE_FIELDS_ATTRIBUTE = 'ontology.attribute_fields';
/** The fields a `joins_with` relationship joins on, and the share of sampled values that matched. */
export const ONTOLOGY_FROM_FIELD_ATTRIBUTE = 'ontology.from_field';
export const ONTOLOGY_TO_FIELD_ATTRIBUTE = 'ontology.to_field';
export const ONTOLOGY_OVERLAP_ATTRIBUTE = 'ontology.overlap';

/** Built-in relationship from a term to a dataset that stores it. */
export const STORED_IN_RELATIONSHIP_TYPE = 'stored_in';
/** Built-in relationship between two datasets whose fields hold the same values. */
export const JOINS_WITH_RELATIONSHIP_TYPE = 'joins_with';

/** The prefix of the `derived_from` reference an ontology KI cites a source of the AI index by. */
export const SOURCE_URI_PREFIX = 'source://';

/** The dataset name of a connector source: connector names can change, ids cannot. */
export const connectorDatasetName = (connectorId: string): string => `connector:${connectorId}`;

export const DEFAULT_ONTOLOGY_REFRESH_INTERVAL = '7d';
export const MAX_ONTOLOGY_REFRESH_INTERVAL_LENGTH = 16;

/** Datasets one source catalogs. */
export const MAX_ONTOLOGY_DATASETS = 50;
/** Datasets one run profiles and describes; the rest wait for the next run. */
export const MAX_ONTOLOGY_DATASETS_PER_RUN = 10;
/** Fields kept per dataset, in name order. */
export const MAX_ONTOLOGY_FIELDS = 500;
export const MAX_ONTOLOGY_FIELD_NAME_LENGTH = 512;
export const MAX_ONTOLOGY_DATASET_NAME_LENGTH = 512;
/** Fields of a dataset recorded as join targets for other sources' datasets. */
export const MAX_ONTOLOGY_JOIN_FIELDS = 100;
/** Keyword-like fields whose distinct values are counted. */
export const MAX_PROFILED_KEYWORD_FIELDS = 30;
/** Low-cardinality fields whose top values are read. */
export const MAX_TOP_VALUE_FIELDS = 15;
export const ONTOLOGY_TOP_VALUES = 5;
/** Top values are read only for fields with at most this many distinct values. */
export const MAX_TOP_VALUE_CARDINALITY = 100;
export const MAX_TOP_VALUE_LENGTH = 100;
export const MAX_PROFILED_NUMERIC_FIELDS = 20;
/** Value profiles of a dataset with a time field cover this many days. */
export const ONTOLOGY_PROFILE_WINDOW_DAYS = 30;

/** Read sub-actions one connector run calls to sample its records. */
export const MAX_CONNECTOR_SAMPLE_CALLS = 5;
/** Characters of one sample call's result the describing model reads. */
export const MAX_CONNECTOR_SAMPLE_CHARS = 8000;
/** Record fields kept from a connector's samples. */
export const MAX_CONNECTOR_FIELDS = 200;
/** Distinct values kept per connector field, to check joins with. */
export const MAX_CONNECTOR_SAMPLE_VALUES = 20;
export const MAX_CONNECTOR_PARAMS_LENGTH = 2048;

export const MAX_ONTOLOGY_TERMS = 100;
export const MAX_ONTOLOGY_TERM_NAME_LENGTH = 128;
export const MAX_ONTOLOGY_TERM_SYNONYMS = 20;
export const MAX_ONTOLOGY_TERM_FIELDS = 20;
/** Calls kept per dataset from the query history. */
export const MAX_ONTOLOGY_QUERY_HISTORY = 10;
/** Rounds one query history read scans. */
export const MAX_ONTOLOGY_HISTORY_ROUNDS = 200;

export const MAX_ONTOLOGY_JOIN_CANDIDATES = 50;
/** Distinct values sampled on the `from` side of a join candidate. */
export const ONTOLOGY_JOIN_SAMPLE_SIZE = 200;
/** Fewest sampled values a join candidate is checked with. */
export const MIN_ONTOLOGY_JOIN_SAMPLE = 3;
/** The share of sampled values the `to` side must hold to keep a join. */
export const MIN_ONTOLOGY_JOIN_OVERLAP = 0.5;

/**
 * Field names whose values are never profiled: values of such fields would leave the source's
 * access control as text in a KI every reader of the AI index can see.
 */
export const SENSITIVE_FIELD_PATTERN =
  /(pass(word)?|secret|token|api[_-]?key|credential|auth|cookie|session|e?mail|phone|ssn|card|iban|address|(^|[._])ip($|[._])|user\.name|username|full_?name|first_?name|last_?name|birth)/i;

export const isSensitiveField = (name: string): boolean => SENSITIVE_FIELD_PATTERN.test(name);

/** What ontology discovery builds from the AI index's sources. */
export interface AiIndexOntologyConfig {
  /** Whether ontology discovery runs on the dreaming schedule, one workflow per source. */
  enabled: boolean;
  /**
   * Show the model the values of low-cardinality fields and connector records. Off: names, types
   * and counts only.
   */
  value_samples?: boolean;
  /** Read the ES|QL queries and connector calls agents ran from the AI index's trace sources. */
  query_history?: boolean;
  /** Describe a dataset whose fields did not change again after this long. */
  refresh_interval?: string;
}

/** An ontology config with its defaults filled in. */
export interface ResolvedOntologyConfig {
  enabled: boolean;
  valueSamples: boolean;
  queryHistory: boolean;
  refreshInterval: string;
}

export const resolveOntologyConfig = (
  config: AiIndexOntologyConfig | null | undefined
): ResolvedOntologyConfig => ({
  enabled: config?.enabled === true,
  valueSamples: config?.value_samples ?? true,
  queryHistory: config?.query_history ?? true,
  refreshInterval: config?.refresh_interval ?? DEFAULT_ONTOLOGY_REFRESH_INTERVAL,
});

/** Whether an AI index has dreaming on with ontology discovery turned on. */
export const discoversOntology = ({ dreaming }: { dreaming?: AiIndexDreamingConfig }): boolean =>
  dreaming?.enabled === true && dreaming.ontology?.enabled === true;
