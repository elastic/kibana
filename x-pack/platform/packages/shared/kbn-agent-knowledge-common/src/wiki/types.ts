/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Nightshift managed Context Engine AI index that stores Wiki pages as KIs. */
export const NIGHTSHIFT_WIKI_AI_INDEX_ID = 'nightshift-wiki';

/** Backing index for {@link NIGHTSHIFT_WIKI_AI_INDEX_ID}. Must use the `ai-index-idx-` prefix. */
export const NIGHTSHIFT_WIKI_AI_INDEX_DEST = 'ai-index-idx-nightshift-wiki';

/** AlertZero managed Context Engine AI index that stores Wiki pages as KIs. */
export const ALERTZERO_WIKI_AI_INDEX_ID = 'alertzero-wiki';

/** Backing index for {@link ALERTZERO_WIKI_AI_INDEX_ID}. Must use the `ai-index-idx-` prefix. */
export const ALERTZERO_WIKI_AI_INDEX_DEST = 'ai-index-idx-alertzero-wiki';

/**
 * @deprecated Use {@link NIGHTSHIFT_WIKI_AI_INDEX_ID}. Kept for Nightshift import compatibility.
 */
export const WIKI_AI_INDEX_ID = NIGHTSHIFT_WIKI_AI_INDEX_ID;

/**
 * @deprecated Use {@link NIGHTSHIFT_WIKI_AI_INDEX_DEST}. Kept for Nightshift import compatibility.
 */
export const WIKI_AI_INDEX_DEST = NIGHTSHIFT_WIKI_AI_INDEX_DEST;

export const NIGHTSHIFT_WIKI_ENTITY_TYPES = [
  'integration',
  'service',
  'alert',
  'runbook',
  'query',
  'dashboard',
  'postmortem',
  'topic',
  'glossary',
  'ontology',
] as const;

export type NightshiftWikiEntityType = (typeof NIGHTSHIFT_WIKI_ENTITY_TYPES)[number];

export const ALERTZERO_WIKI_ENTITY_TYPES = [
  'detection_rule',
  'data_source',
  'technique',
  'asset_role',
  'correlation_pattern',
  'ontology',
] as const;

export type AlertZeroWikiEntityType = (typeof ALERTZERO_WIKI_ENTITY_TYPES)[number];

/**
 * Nightshift entity types. Prefer {@link NIGHTSHIFT_WIKI_ENTITY_TYPES} for new code; this alias
 * keeps existing Nightshift imports working.
 */
export const WIKI_ENTITY_TYPES = NIGHTSHIFT_WIKI_ENTITY_TYPES;

export type WikiEntityType = NightshiftWikiEntityType | AlertZeroWikiEntityType;

export const WIKI_PAGE_STATUSES = ['established', 'tentative', 'archived'] as const;

export type WikiPageStatus = (typeof WIKI_PAGE_STATUSES)[number];

/** Confirmations from later runs a tentative page needs before it is promoted to established. */
export const WIKI_PROMOTION_CORROBORATIONS = 1;

/**
 * What a round is to the optimizer. A follow-up may correct or extend the previous answer, so it
 * carries more weight than a single investigation, but one person's say-so never confirms a page.
 */
export const WIKI_ROUND_KINDS = ['initial', 'follow_up'] as const;

export type WikiRoundKind = (typeof WIKI_ROUND_KINDS)[number];

/** Edits the post-run optimizer can apply to a page. */
export const WIKI_EDIT_ACTIONS = ['upsert', 'corroborate', 'archive'] as const;

export type WikiEditAction = (typeof WIKI_EDIT_ACTIONS)[number];

export const NIGHTSHIFT_WIKI_ENTITY_TYPE_BUCKETS: Record<NightshiftWikiEntityType, string> = {
  integration: 'integrations',
  service: 'services',
  alert: 'alerts',
  runbook: 'runbooks',
  query: 'queries',
  dashboard: 'dashboards',
  postmortem: 'postmortems',
  topic: 'topics',
  glossary: 'glossary',
  ontology: 'ontology',
};

/** @deprecated Use {@link NIGHTSHIFT_WIKI_ENTITY_TYPE_BUCKETS}. */
export const WIKI_ENTITY_TYPE_BUCKETS = NIGHTSHIFT_WIKI_ENTITY_TYPE_BUCKETS;

export const ALERTZERO_WIKI_ENTITY_TYPE_BUCKETS: Record<AlertZeroWikiEntityType, string> = {
  detection_rule: 'detection-rules',
  data_source: 'data-sources',
  technique: 'techniques',
  asset_role: 'asset-roles',
  correlation_pattern: 'correlation-patterns',
  ontology: 'ontology',
};

/**
 * The markdown sections each Nightshift entity type's pages use, in order. The optimizer prompt is
 * generated from this so the sections it asks for are the ones the page checks and the UI read.
 */
export const NIGHTSHIFT_WIKI_SECTIONS_BY_TYPE: Record<
  NightshiftWikiEntityType,
  readonly string[]
> = {
  integration: [
    'Overview',
    'Access',
    'Capabilities',
    'Query conventions',
    'Tool failures',
    'Common pitfalls',
  ],
  service: ['Overview', 'Dependencies', 'Telemetry', 'Failure modes', 'Related links'],
  alert: ['Symptom', 'Likely causes', 'First-look checks', 'Related links'],
  runbook: ['Trigger', 'Investigation steps', 'Resolution'],
  query: ['Purpose', 'Query', 'Notes'],
  dashboard: ['URL', 'What it shows'],
  postmortem: ['Incident summary', 'Root cause', 'Detection signals', 'Remediation'],
  topic: ['Overview', 'Established facts', 'Open questions', 'Related links'],
  glossary: [],
  ontology: ['Nodes', 'Relations', 'Concepts'],
};

/** @deprecated Use {@link NIGHTSHIFT_WIKI_SECTIONS_BY_TYPE}. */
export const WIKI_SECTIONS_BY_TYPE = NIGHTSHIFT_WIKI_SECTIONS_BY_TYPE;

export const ALERTZERO_WIKI_SECTIONS_BY_TYPE: Record<AlertZeroWikiEntityType, readonly string[]> = {
  detection_rule: ['Detects', 'Data', 'Known benign', 'Do not exclude', 'Related links'],
  data_source: ['Index', 'Fields', 'Notes'],
  technique: ['Coverage', 'Rejected drafts', 'Related links'],
  asset_role: ['Members', 'Expected activity', 'Not expected', 'Telemetry'],
  correlation_pattern: ['Shape', 'Benign', 'Malicious'],
  ontology: ['Nodes', 'Relations', 'Concepts'],
};

export interface WikiPageSummary {
  id: string;
  title: string;
  entity_type: WikiEntityType;
  status: WikiPageStatus;
  corroborations: number;
  updated_at: string;
  description?: string;
  conversation_id?: string;
  round_id?: string;
  workflow_execution_id?: string;
  /**
   * Conversations that created or rewrote the page, unlike `conversation_id`, which names whoever
   * wrote it last, including a write that only corroborated it.
   */
  authored_by?: string[];
  doc_version?: number;
}

export interface WikiPage extends WikiPageSummary {
  content: string;
  slug: string;
  /** Opaque stored-document version; pass it back on a write to reject concurrent changes. */
  version?: string;
}

export interface WikiStats {
  total: number;
  established: number;
  total_corroborations: number;
  last_updated?: string;
}

export interface ListWikiPagesResponse {
  pages: WikiPageSummary[];
  stats: WikiStats;
}

export interface GetWikiPageResponse {
  page: WikiPage;
}

export interface WikiPageWrite {
  entityType: WikiEntityType;
  slug: string;
  title: string;
  description?: string;
  content: string;
  status: WikiPageStatus;
  corroborations?: number;
  /** When set, the write fails with a version conflict if the stored page has changed since. */
  version?: string;
  docVersion?: number;
  conversationId?: string;
  roundId?: string;
  workflowExecutionId?: string;
  /** Replaces the stored list of authoring conversations; omit it to keep the stored one. */
  authoredBy?: string[];
}

export interface WikiWriteProvenance {
  conversationId?: string;
  roundId?: string;
  workflowExecutionId?: string;
}

/** Product id used when registering a wiki type pack with the agent knowledge plugin. */
export const AGENT_KNOWLEDGE_PRODUCTS = ['nightshift', 'alertzero'] as const;

export type AgentKnowledgeProduct = (typeof AGENT_KNOWLEDGE_PRODUCTS)[number];

export interface WikiTypePack {
  product: AgentKnowledgeProduct;
  entityTypes: readonly string[];
  sectionsByType: Record<string, readonly string[]>;
  bucketsByType: Record<string, string>;
  /** Extra ontology relation kinds beyond the shared defaults. */
  relationKinds?: readonly string[];
}
