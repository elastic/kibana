/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComplianceEvaluation, CompliancePlatform } from './constants';

export interface ComplianceFrameworkMapping {
  id: string;
  version: string;
  control: string;
}

export interface ComplianceBenchmarkMetadata {
  id: string;
  name: string;
  version: string;
  posture_type: 'endpoint';
}

export interface ComplianceRuleMetadata {
  rule_id: string;
  name: string;
  description: string;
  query: string;
  remediation: string;
  benchmark: ComplianceBenchmarkMetadata;
  rule_number: string;
  section: string;
  level: 1 | 2;
  platform: CompliancePlatform;
  frameworks: ComplianceFrameworkMapping[];
  tags: string[];
  enabled: boolean;
  interval: number;
  prebuilt: boolean;
  resource_type: string;
}

export interface ComplianceFinding {
  '@timestamp': string;
  result: {
    evaluation: ComplianceEvaluation;
    evidence?: Record<string, unknown>;
  };
  rule: {
    id: string;
    name: string;
    description: string;
    remediation: string;
    benchmark: ComplianceBenchmarkMetadata & { rule_number: string };
    section: string;
    level: 1 | 2;
    frameworks: ComplianceFrameworkMapping[];
    tags: string[];
  };
  host: {
    id: string;
    name: string;
    os: {
      family: string;
      name: string;
      version: string;
      platform: string;
    };
  };
  agent: {
    id: string;
    type: string;
    version: string;
  };
  resource: {
    type: string;
    sub_type: string;
  };
  data_stream: {
    dataset: string;
    namespace: string;
    type: string;
  };
}

export interface ComplianceScore {
  '@timestamp': string;
  score: number;
  total_findings: number;
  passed_findings: number;
  failed_findings: number;
  not_applicable_findings: number;
  rule: {
    benchmark: {
      id: string;
      name: string;
      version: string;
    };
  };
  policy_template: 'endpoint_compliance';
  host_count: number;
  is_enabled_rules_score: boolean;
  namespace: string;
}

export interface ComplianceBenchmarkInfo {
  id: string;
  name: string;
  version: string;
  total_rules: number;
  enabled_rules: number;
  platforms: CompliancePlatform[];
  levels: number[];
}

export interface ComplianceSectionScore {
  section: string;
  passed: number;
  failed: number;
  score: number;
}

export interface ComplianceHostScore {
  host_id: string;
  host_name: string;
  os_name: string;
  os_version: string;
  passed: number;
  failed: number;
  score: number;
  last_evaluated: string;
}

export interface ComplianceDashboardStats {
  score: number;
  total_findings: number;
  passed_findings: number;
  failed_findings: number;
  not_applicable_findings: number;
  host_count: number;
  benchmark: ComplianceBenchmarkMetadata;
  sections: ComplianceSectionScore[];
  worst_hosts: ComplianceHostScore[];
  trend: Array<{ timestamp: string; score: number }>;
}

export interface MutedRulesState {
  [ruleKey: string]: {
    muted: boolean;
    benchmark_id: string;
    benchmark_version: string;
    rule_number: string;
    muted_at?: string;
    muted_by?: string;
  };
}
