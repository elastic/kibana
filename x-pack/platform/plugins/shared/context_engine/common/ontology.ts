/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Type prefix of the KIs ontology discovery writes. */
export const ONTOLOGY_TYPE_PREFIX = 'ontology.';
/** One index, data stream or alias an ES|QL source of the AI index reads from. */
export const ONTOLOGY_DATASET_KI_TYPE = 'ontology.dataset';
/** A business concept, such as Customer, stored in the fields of one or more datasets. */
export const ONTOLOGY_TERM_KI_TYPE = 'ontology.term';

export const isOntologyKiType = (type: string): boolean => type.startsWith(ONTOLOGY_TYPE_PREFIX);

/** Whether a person reviewed an ontology KI. Discovery never changes a certified one. */
export const ONTOLOGY_STATUS_ATTRIBUTE = 'ontology.status';
export const ONTOLOGY_STATUSES = ['draft', 'certified'] as const;
export type OntologyStatus = (typeof ONTOLOGY_STATUSES)[number];

/** The concrete index expression a dataset KI describes. */
export const ONTOLOGY_INDEX_ATTRIBUTE = 'ontology.index';
/** A hash of the dataset's field names and types: an unchanged mapping is not described again. */
export const ONTOLOGY_FINGERPRINT_ATTRIBUTE = 'ontology.fingerprint';
/** When the dataset's values were last profiled. */
export const ONTOLOGY_PROFILED_AT_ATTRIBUTE = 'ontology.profiled_at';
export const ONTOLOGY_TIME_FIELD_ATTRIBUTE = 'ontology.time_field';
export const ONTOLOGY_ROW_COUNT_ATTRIBUTE = 'ontology.row_count';
/** Other names of a term, such as `client` for Customer. */
export const ONTOLOGY_SYNONYMS_ATTRIBUTE = 'ontology.synonyms';
/** Where a term is stored, as `<dataset>:<field>`. */
export const ONTOLOGY_FIELDS_ATTRIBUTE = 'ontology.fields';
/** The fields a `joins_with` relationship joins on, and the share of sampled values that matched. */
export const ONTOLOGY_FROM_FIELD_ATTRIBUTE = 'ontology.from_field';
export const ONTOLOGY_TO_FIELD_ATTRIBUTE = 'ontology.to_field';
export const ONTOLOGY_OVERLAP_ATTRIBUTE = 'ontology.overlap';

/** Built-in relationship from a term to a dataset that stores it. */
export const STORED_IN_RELATIONSHIP_TYPE = 'stored_in';
/** Built-in relationship between two datasets whose fields hold the same values. */
export const JOINS_WITH_RELATIONSHIP_TYPE = 'joins_with';

export const DEFAULT_ONTOLOGY_REFRESH_INTERVAL = '7d';
export const MAX_ONTOLOGY_REFRESH_INTERVAL_LENGTH = 16;

/** Datasets one run catalogs, across all ES|QL sources. */
export const MAX_ONTOLOGY_DATASETS = 50;
/** Datasets one run profiles and describes; the rest wait for the next run. */
export const MAX_ONTOLOGY_DATASETS_PER_RUN = 10;
/** Fields kept per dataset, in name order. */
export const MAX_ONTOLOGY_FIELDS = 500;
export const MAX_ONTOLOGY_FIELD_NAME_LENGTH = 512;
export const MAX_ONTOLOGY_DATASET_NAME_LENGTH = 512;
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

export const MAX_ONTOLOGY_TERMS = 100;
export const MAX_ONTOLOGY_TERM_NAME_LENGTH = 128;
export const MAX_ONTOLOGY_TERM_SYNONYMS = 20;
export const MAX_ONTOLOGY_TERM_FIELDS = 20;
/** ES|QL queries kept per dataset from the query history. */
export const MAX_ONTOLOGY_QUERY_HISTORY = 10;
/** Rounds one query history read scans. */
export const MAX_ONTOLOGY_HISTORY_ROUNDS = 200;

export const MAX_ONTOLOGY_JOIN_CANDIDATES = 50;
/** Distinct values sampled on the `from` side of a join candidate. */
export const ONTOLOGY_JOIN_SAMPLE_SIZE = 200;
/** The share of sampled values the `to` side must hold to keep a join. */
export const MIN_ONTOLOGY_JOIN_OVERLAP = 0.5;

/**
 * Field names whose values are never profiled: values of such fields would leave the source's
 * access control as text in a KI every reader of the AI index can see.
 */
export const SENSITIVE_FIELD_PATTERN =
  /(pass(word)?|secret|token|api[_-]?key|credential|auth|cookie|session|e?mail|phone|ssn|card|iban|address|(^|[._])ip($|[._])|user\.name|username|full_?name|first_?name|last_?name|birth)/i;

export const isSensitiveField = (name: string): boolean => SENSITIVE_FIELD_PATTERN.test(name);

/** What ontology discovery builds from the AI index's ES|QL sources. */
export interface AiIndexOntologyConfig {
  /** Whether ontology discovery runs on the dreaming schedule. */
  enabled: boolean;
  /** Profile the top values of low-cardinality keyword fields. Off: names, types and counts only. */
  value_samples?: boolean;
  /** Read the ES|QL queries agents ran from the AI index's trace sources. */
  query_history?: boolean;
  /** Re-profile a dataset whose mapping did not change after this long. */
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
