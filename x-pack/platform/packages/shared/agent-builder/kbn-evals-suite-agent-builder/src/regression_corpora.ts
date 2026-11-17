/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface CorpusSnapshot {
  bucket: string;
  basePath: string;
  snapshotName: string;
}

export interface RegressionCorpus {
  /** Short name used in logs and error messages. */
  name: string;
  snapshot: CorpusSnapshot;
  indices: readonly string[];
}

const SNAPSHOT_BUCKET = 'agent-builder-data-science-datasets';

// The full corpora, restored in their entirety (not just the indices the datasets
// query) so the agent's index discovery sees the same contextual landscape as a real
// deployment (questions may require picking the right source among look-alikes).

export const ANALYTICAL_CORPUS: RegressionCorpus = {
  name: 'analytical',
  snapshot: {
    bucket: SNAPSHOT_BUCKET,
    basePath: 'snapshots/analytical_datasets_multi_domain',
    snapshotName: 'analytical_datasets_multi_domain',
  },
  indices: [
    'customer_flight_activity',
    'customer_loyalty_history',
    'users',
    'projects',
    'invoice',
    'invoice_item',
    'project_entitlement_catalog',
    'project_entitlement_access',
    'plans',
    'plan_entitlement_access',
    'project_plan_changelogs',
    'requests_daily_count',
    'error_rate_daily',
    'support_user',
    'support_ticket',
    'customers',
    'exchange_rates',
    'products',
    'sales',
    'stores',
    'measures',
    'national_results',
    'questions',
    'reports',
    'responses',
    'state_results',
    'states',
  ],
};

export const BROWSECOMP_PLUS_CORPUS: RegressionCorpus = {
  name: 'browsecomp-plus',
  snapshot: {
    bucket: SNAPSHOT_BUCKET,
    basePath: 'snapshots/browsecomp_plus',
    snapshotName: 'browsecomp_plus_documents_semantic',
  },
  indices: ['browsecomp_plus_documents_semantic'],
};

export const ENTERPRISE_RAG_BENCH_CORPUS: RegressionCorpus = {
  name: 'enterprise-rag-bench',
  snapshot: {
    bucket: SNAPSHOT_BUCKET,
    basePath: 'snapshots/enterprise_rag_bench',
    snapshotName: 'enterprise_rag_bench_documents_semantic',
  },
  indices: [
    'enterprise_rag_bench_slack_documents_semantic',
    'enterprise_rag_bench_gmail_documents_semantic',
    'enterprise_rag_bench_linear_documents_semantic',
    'enterprise_rag_bench_google_drive_documents_semantic',
    'enterprise_rag_bench_hubspot_documents_semantic',
    'enterprise_rag_bench_fireflies_documents_semantic',
    'enterprise_rag_bench_github_documents_semantic',
    'enterprise_rag_bench_jira_documents_semantic',
    'enterprise_rag_bench_confluence_documents_semantic',
  ],
};

/**
 * Every corpus the regression suite depends on. Each spec ensures all of them — not just
 * its own — so parallel workers all see the same index-discovery landscape and no
 * example runs while another corpus is still restoring.
 */
export const ALL_REGRESSION_CORPORA: readonly RegressionCorpus[] = [
  ANALYTICAL_CORPUS,
  BROWSECOMP_PLUS_CORPUS,
  ENTERPRISE_RAG_BENCH_CORPUS,
];
