/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const COMPLIANCE_FINDINGS_DATA_STREAM = 'logs-endpoint_compliance.findings-default';
export const COMPLIANCE_FINDINGS_INDEX_PATTERN = 'logs-endpoint_compliance.findings-*';
export const COMPLIANCE_FINDINGS_LATEST_INDEX = 'endpoint_compliance.findings_latest-default';

export const COMPLIANCE_SCORES_DATA_STREAM = 'logs-endpoint_compliance.scores-default';
export const COMPLIANCE_SCORES_INDEX_PATTERN = 'logs-endpoint_compliance.scores-*';

export const COMPLIANCE_RULE_SO_TYPE = 'endpoint-compliance-rule';
export const COMPLIANCE_EXCEPTION_SO_TYPE = 'endpoint-compliance-exception';
export const COMPLIANCE_BENCHMARK_STATE_SO_TYPE = 'endpoint-compliance-benchmark-state';

export const COMPLIANCE_SCHEDULE_ID_PREFIX = 'compliance-';

export const COMPLIANCE_API_BASE = '/internal/endpoint_compliance';

export const COMPLIANCE_SCORE_AGGREGATION_TASK_TYPE = 'endpoint-compliance:score-aggregation';
export const COMPLIANCE_SCORE_AGGREGATION_INTERVAL = '5m';

export const COMPLIANCE_ILM_POLICY_FINDINGS = 'endpoint_compliance_findings';
export const COMPLIANCE_ILM_POLICY_SCORES = 'endpoint_compliance_scores';

export const COMPLIANCE_FINDINGS_DATA_VIEW_ID = 'endpoint-compliance-findings';
export const COMPLIANCE_SCORES_DATA_VIEW_ID = 'endpoint-compliance-scores';

export const COMPLIANCE_PLATFORMS = ['darwin', 'windows', 'linux'] as const;
export type CompliancePlatform = (typeof COMPLIANCE_PLATFORMS)[number];

export const COMPLIANCE_EVALUATIONS = ['passed', 'failed', 'not_applicable'] as const;
export type ComplianceEvaluation = (typeof COMPLIANCE_EVALUATIONS)[number];

export const VALID_TIME_RANGES = ['24h', '7d', '30d'] as const;
export type ComplianceTimeRange = (typeof VALID_TIME_RANGES)[number];
