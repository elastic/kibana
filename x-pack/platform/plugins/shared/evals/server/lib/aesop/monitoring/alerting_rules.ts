/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * AESOP Alerting Rules Configuration
 *
 * Defines production alerting rules for autonomous skill discovery system:
 * - Exploration failures
 * - Low approval rates
 * - High token usage
 * - Performance degradation
 * - Skill quality issues
 *
 * Rules are stored in .aesop-alert-rules index and can be evaluated
 * by Kibana Alerting framework or custom monitoring services.
 */

export interface AlertingRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'esql' | 'threshold' | 'kuery';
  query?: {
    esql?: string;
    kuery?: string;
  };
  threshold?: {
    value: number;
    comparator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  };
  interval: string;
  tags?: string[];
}

/**
 * Alert Rule Definitions for AESOP System
 *
 * These rules monitor the health and performance of the autonomous skill discovery system.
 */
export const ALERTING_RULES: AlertingRule[] = [
  // CRITICAL: Exploration Failures
  {
    id: 'aesop.exploration.failure_rate_high',
    name: 'AESOP: High Exploration Failure Rate',
    description: 'More than 10% of explorations are failing in the last 24 hours',
    rule_type: 'esql',
    query: {
      esql: `FROM .aesop-workflow-executions
| WHERE workflow_name == "aesop.self_exploration"
  AND started_at >= NOW() - 24 hours
| STATS total = COUNT(), failures = COUNT(status == "failed")
| EVAL failure_rate = (failures / total) * 100
| WHERE failure_rate > 10`,
    },
    interval: '1h',
    tags: ['aesop', 'critical', 'exploration', 'reliability'],
  },

  // HIGH: Low Approval Rate
  {
    id: 'aesop.skills.approval_rate_low',
    name: 'AESOP: Low Skill Approval Rate',
    description: 'Skill approval rate below 30% in the last 7 days (indicates quality issues)',
    rule_type: 'esql',
    query: {
      esql: `FROM .aesop-proposed-skills
| WHERE created_at >= NOW() - 7 days
| STATS total = COUNT(),
        approved = COUNT(review.status == "approved")
| EVAL approval_rate = (approved / total) * 100
| WHERE approval_rate < 30`,
    },
    interval: '6h',
    tags: ['aesop', 'high', 'quality', 'skills'],
  },

  // HIGH: Exploration Timeout
  {
    id: 'aesop.exploration.duration_excessive',
    name: 'AESOP: Exploration Duration Excessive',
    description: 'Exploration running longer than 4 hours (likely stuck)',
    rule_type: 'esql',
    query: {
      esql: `FROM .aesop-workflow-executions
| WHERE workflow_name == "aesop.self_exploration"
  AND status == "running"
  AND started_at <= NOW() - 4 hours`,
    },
    interval: '30m',
    tags: ['aesop', 'high', 'performance', 'timeout'],
  },

  // MEDIUM: High Token Usage
  {
    id: 'aesop.cost.token_usage_high',
    name: 'AESOP: High Token Usage',
    description: 'Single exploration consumed more than 50K tokens',
    rule_type: 'esql',
    query: {
      esql: `FROM traces-apm.otel-*
| WHERE attributes.aesop.workflow.execution_id IS NOT NULL
| STATS total_tokens = SUM(attributes.gen_ai.usage.prompt_tokens) +
                       SUM(attributes.gen_ai.usage.completion_tokens)
  BY attributes.aesop.workflow.execution_id
| WHERE total_tokens > 50000`,
    },
    interval: '1h',
    tags: ['aesop', 'medium', 'cost', 'tokens'],
  },

  // MEDIUM: Skill Validation Failures
  {
    id: 'aesop.skills.validation_failure_rate_high',
    name: 'AESOP: High Skill Validation Failure Rate',
    description: 'More than 15% of skill validations are failing in the last 7 days',
    rule_type: 'esql',
    query: {
      esql: `FROM .aesop-proposed-skills
| WHERE created_at >= NOW() - 7 days
  AND validation.quality_score IS NOT NULL
| STATS total = COUNT(),
        failed = COUNT(validation.passed == false)
| EVAL failure_rate = (failed / total) * 100
| WHERE failure_rate > 15`,
    },
    interval: '6h',
    tags: ['aesop', 'medium', 'quality', 'validation'],
  },

  // LOW: No Recent Explorations
  {
    id: 'aesop.exploration.no_recent_activity',
    name: 'AESOP: No Recent Exploration Activity',
    description: 'No explorations run in the last 7 days',
    rule_type: 'esql',
    query: {
      esql: `FROM .aesop-workflow-executions
| WHERE workflow_name == "aesop.self_exploration"
| STATS latest = MAX(started_at)
| WHERE latest <= NOW() - 7 days`,
    },
    interval: '24h',
    tags: ['aesop', 'low', 'activity'],
  },

  // MEDIUM: Approval Rate Not Improving
  {
    id: 'aesop.learning.approval_rate_stagnant',
    name: 'AESOP: Approval Rate Not Improving',
    description: 'Approval rate has not improved in the last 3 cycles (21 days)',
    rule_type: 'esql',
    query: {
      esql: `FROM .aesop-proposed-skills
| WHERE created_at >= NOW() - 21 days
| STATS approval_rate = COUNT(review.status == "approved") / COUNT() * 100
  BY metadata.cycle_number
| SORT metadata.cycle_number ASC
| LIMIT 3
| STATS cycles = COUNT(),
        improvement = MAX(approval_rate) - MIN(approval_rate)
| WHERE cycles >= 3 AND improvement <= 0`,
    },
    interval: '24h',
    tags: ['aesop', 'medium', 'learning', 'improvement'],
  },

  // MEDIUM: Low Coverage
  {
    id: 'aesop.discovery.coverage_low',
    name: 'AESOP: Low Discovery Coverage',
    description: 'Exploration coverage below 50% of scoped indices',
    rule_type: 'esql',
    query: {
      esql: `FROM .aesop-workflow-executions
| WHERE workflow_name == "aesop.self_exploration"
  AND status == "completed"
| STATS latest = MAX(started_at)
| WHERE latest >= NOW() - 1 day
| EVAL coverage = metrics.indices_discovered / metrics.total_indices * 100
| WHERE coverage < 50`,
    },
    interval: '12h',
    tags: ['aesop', 'medium', 'coverage', 'discovery'],
  },
];
