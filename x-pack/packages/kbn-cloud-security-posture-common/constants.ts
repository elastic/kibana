/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const KSPM_POLICY_TEMPLATE = 'kspm';
export const CSPM_POLICY_TEMPLATE = 'cspm';
export const CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN =
  'logs-cloud_security_posture.findings_latest-default';
export const CDR_LATEST_THIRD_PARTY_MISCONFIGURATIONS_INDEX_PATTERN =
  'security_solution-*.misconfiguration_latest';
export const CDR_MISCONFIGURATIONS_INDEX_PATTERN = `${CDR_LATEST_NATIVE_MISCONFIGURATIONS_INDEX_PATTERN},${CDR_LATEST_THIRD_PARTY_MISCONFIGURATIONS_INDEX_PATTERN}`;
export const CDR_MISCONFIGURATIONS_DATA_VIEW_NAME = 'Latest Cloud Security Misconfigurations';
export const LATEST_FINDINGS_RETENTION_POLICY = '26h';
export const MAX_FINDINGS_TO_LOAD = 500;
export const CSP_GET_BENCHMARK_RULES_STATE_ROUTE_PATH =
  '/internal/cloud_security_posture/rules/_get_states';
export const CSP_GET_BENCHMARK_RULES_STATE_API_CURRENT_VERSION = '1';
export const STATUS_ROUTE_PATH = '/internal/cloud_security_posture/status';
export const STATUS_API_CURRENT_VERSION = '1';

/** The base path for all cloud security posture pages. */
export const CLOUD_SECURITY_POSTURE_BASE_PATH = '/cloud_security_posture';

export const CDR_MISCONFIGURATIONS_DATA_VIEW_ID_PREFIX =
  'security_solution_cdr_latest_misconfigurations';
export const SECURITY_DEFAULT_DATA_VIEW_ID = 'security-solution-default';

export const CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN =
  'logs-cloud_security_posture.vulnerabilities_latest-default';
export const CDR_LATEST_THIRD_PARTY_VULNERABILITIES_INDEX_PATTERN =
  'security_solution-*.vulnerability_latest';
export const CDR_VULNERABILITIES_INDEX_PATTERN = `${CDR_LATEST_THIRD_PARTY_VULNERABILITIES_INDEX_PATTERN},${CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN}`;
export const LATEST_VULNERABILITIES_RETENTION_POLICY = '3d';
