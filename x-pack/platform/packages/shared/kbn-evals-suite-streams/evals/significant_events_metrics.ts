/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import type { ElasticsearchClient } from '@kbn/core/server';

/** Severity score must be within this inclusive range */
export const SEVERITY_SCORE_MIN = 0;
export const SEVERITY_SCORE_MAX = 100;

/** A meaningful title must have at least this many words */
export const MIN_TITLE_WORD_COUNT = 3;

/** Composite score weights -- must sum to 1.0 */
export const WEIGHT_KQL_SYNTAX = 0.2;
export const WEIGHT_EXECUTION_HITS = 0.15;
export const WEIGHT_CATEGORY_RECALL = 0.2;
export const WEIGHT_KQL_SUBSTRING_RECALL = 0.15;
export const WEIGHT_CATEGORY_COMPLIANCE = 0.05;
export const WEIGHT_SEVERITY_COMPLIANCE = 0.05;
export const WEIGHT_EVIDENCE_GROUNDING = 0.1;
export const WEIGHT_TITLE_QUALITY = 0.1;

const WEIGHT_SUM =
  WEIGHT_KQL_SYNTAX +
  WEIGHT_EXECUTION_HITS +
  WEIGHT_CATEGORY_RECALL +
  WEIGHT_KQL_SUBSTRING_RECALL +
  WEIGHT_CATEGORY_COMPLIANCE +
  WEIGHT_SEVERITY_COMPLIANCE +
  WEIGHT_EVIDENCE_GROUNDING +
  WEIGHT_TITLE_QUALITY;

if (Math.abs(WEIGHT_SUM - 1) > 1e-9) {
  throw new Error(`Composite score weights must sum to 1.0, got ${WEIGHT_SUM}`);
}

export const CHECK_IDS = Object.freeze({
  kqlSyntax: 'kql_syntax',
  executionHit: 'execution_hit',
  categoryCompliance: 'category_compliance',
  severityCompliance: 'severity_compliance',
  evidenceGrounding: 'evidence_grounding',
  titleQuality: 'title_quality',
});

export type CheckId = (typeof CHECK_IDS)[keyof typeof CHECK_IDS];

/** Result of a single atomic check on one query */
export interface CheckResult {
  check: CheckId;
  passed: boolean;
  expected?: string;
  actual: string;
}

/** Full validation result for a single generated query */
export interface QueryValidationDetail {
  kql: string;
  title: string;
  category: string;
  severityScore: number;
  checks: CheckResult[];
}

/**
 * A single KQL substring expectation.
 *
 * - `string`   → the substring MUST be found in at least one generated query's KQL.
 * - `string[]` → at least ONE of the strings must be found (OR semantics within the entry).
 *
 * Top-level array entries are combined with AND: every entry must be satisfied.
 */
export type KqlSubstringExpectation = string | string[];

/** Ground truth for category/substring recall calculations */
export interface SignificantEventsGroundTruth {
  categories: string[];
  kql_substrings?: KqlSubstringExpectation[];
}

/** Aggregated metrics across all queries */
export interface SignificantEventsQualityMetrics {
  syntaxValidityRate: number;
  executionHitRate: number;
  categoryComplianceRate: number;
  severityComplianceRate: number;
  evidenceGroundingRate: number;
  titleQualityRate: number;
  categoryRecall: number;
  kqlSubstringRecall: number;
  overallQuality: number;
}

const getErrorMessage = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/** Validates that a KQL string is syntactically correct */
export const checkKqlSyntax = (kql: string): CheckResult => {
  try {
    fromKueryExpression(kql);
    return { check: CHECK_IDS.kqlSyntax, passed: true, actual: kql };
  } catch (e) {
    return {
      check: CHECK_IDS.kqlSyntax,
      passed: false,
      expected: 'valid KQL',
      actual: getErrorMessage(e),
    };
  }
};

/** Executes a KQL query against ES and checks whether it produces any hits */
export const checkExecutionHit = async (
  kql: string,
  testIndex: string,
  esClient: ElasticsearchClient
): Promise<CheckResult> => {
  try {
    const { values } = await esClient.esql.query({
      query: `FROM ${testIndex} | WHERE KQL("${kql
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')}") | STATS hits = COUNT(*)`,
      drop_null_columns: true,
    });
    const hits = Number(values[0]?.[0] ?? 0);
    return {
      check: CHECK_IDS.executionHit,
      passed: hits > 0,
      expected: '> 0 hits',
      actual: `${hits} hits`,
    };
  } catch (e) {
    return {
      check: CHECK_IDS.executionHit,
      passed: false,
      expected: '> 0 hits',
      actual: `execution error: ${getErrorMessage(e)}`,
    };
  }
};

/** Validates that a category is one of the allowed canonical types */
export const checkCategoryCompliance = (
  category: string,
  allowedCategories: readonly string[]
): CheckResult => {
  const passed = allowedCategories.includes(category);
  return {
    check: CHECK_IDS.categoryCompliance,
    passed,
    expected: `one of [${allowedCategories.join(', ')}]`,
    actual: category,
  };
};

/** Validates that a severity score is within the allowed range */
export const checkSeverityCompliance = (score: number): CheckResult => {
  const passed = score >= SEVERITY_SCORE_MIN && score <= SEVERITY_SCORE_MAX;
  return {
    check: CHECK_IDS.severityCompliance,
    passed,
    expected: `${SEVERITY_SCORE_MIN}-${SEVERITY_SCORE_MAX}`,
    actual: String(score),
  };
};

/** Pattern that matches a leading KQL-style field prefix, e.g. `message: ` */
const FIELD_PREFIX_PATTERN = /^\w+:\s*/;

/**
 * Normalise an evidence string so it can be matched against raw log lines.
 *
 * Strips / normalises:
 *  - leading field-name prefixes like `message: `
 *  - surrounding double-quotes added by the LLM
 *  - escaped double-quotes (`\"` -> `"`)
 *  - runs of whitespace collapsed to a single space
 */
export const normaliseEvidence = (ev: string): string => {
  let normalised = ev.trim();
  normalised = normalised.replace(FIELD_PREFIX_PATTERN, '');
  if (normalised.startsWith('"') && normalised.endsWith('"')) {
    normalised = normalised.slice(1, -1);
  }
  normalised = normalised.replace(/\\"/g, '"');
  normalised = normalised.replace(/\\n/g, '\n');
  normalised = normalised.replace(/\s+/g, ' ');
  return normalised;
};

/** Collapse whitespace in a string for fuzzy substring matching */
const collapseWhitespace = (s: string): string => s.replace(/\s+/g, ' ');

export const checkEvidenceGrounding = (
  evidence: string[] | undefined,
  sampleLogs: string[]
): CheckResult => {
  if (!evidence || evidence.length === 0) {
    return {
      check: CHECK_IDS.evidenceGrounding,
      passed: true,
      actual: 'no evidence provided (ok)',
    };
  }

  const allLogs = collapseWhitespace(sampleLogs.join('\n'));
  const missing = evidence.filter((ev) => {
    const normalised = normaliseEvidence(ev);
    return !allLogs.includes(normalised);
  });

  if (missing.length === 0) {
    return {
      check: CHECK_IDS.evidenceGrounding,
      passed: true,
      actual: `${evidence.length} items found`,
    };
  }

  return {
    check: CHECK_IDS.evidenceGrounding,
    passed: false,
    expected: 'all evidence in sample logs',
    actual: `missing: ${missing.join('; ')}`,
  };
};

/** Validates that a title is descriptive and not a generic placeholder */
export const checkTitleQuality = (title: string): CheckResult => {
  if (!title || title.trim().length === 0) {
    return {
      check: CHECK_IDS.titleQuality,
      passed: false,
      expected: `non-empty, >= ${MIN_TITLE_WORD_COUNT} words`,
      actual: 'empty title',
    };
  }

  const wordCount = title.trim().split(/\s+/).length;
  if (wordCount < MIN_TITLE_WORD_COUNT) {
    return {
      check: CHECK_IDS.titleQuality,
      passed: false,
      expected: `>= ${MIN_TITLE_WORD_COUNT} words`,
      actual: `${wordCount} words: "${title}"`,
    };
  }

  return { check: CHECK_IDS.titleQuality, passed: true, actual: title };
};

/**
 * For each expected category, check if at least one generated query has a
 * matching category. Returns a recall score (0-1).
 */
export const calculateCategoryRecall = (
  queryDetails: QueryValidationDetail[],
  expectedCategories: string[]
): number => {
  if (expectedCategories.length === 0) {
    return 1;
  }

  const generatedCategories = new Set(queryDetails.map((q) => q.category));
  const matched = expectedCategories.filter((cat) => generatedCategories.has(cat));
  return matched.length / expectedCategories.length;
};

/**
 * Check whether a single KQL substring expectation is satisfied by any
 * of the generated queries' KQL strings.
 *
 * - `string`   → must appear in at least one query's KQL (case-insensitive).
 * - `string[]` → at least one of the alternatives must appear (OR semantics).
 */
const isExpectationSatisfied = (
  expectation: KqlSubstringExpectation,
  allKqlLower: string[]
): boolean => {
  const needles = Array.isArray(expectation) ? expectation : [expectation];
  return needles.some((needle) => {
    const normalised = needle.trim().toLowerCase();
    return allKqlLower.some((kql) => kql.includes(normalised));
  });
};

/**
 * For each expected KQL substring entry, check if the expectation is
 * satisfied by at least one generated query's KQL (case-insensitive).
 *
 * Each top-level entry is combined with AND; a `string[]` entry uses OR
 * within its alternatives.
 */
export const calculateKqlSubstringRecall = (
  queryDetails: QueryValidationDetail[],
  expectedSubstrings: KqlSubstringExpectation[] | undefined
): number => {
  if (!expectedSubstrings || expectedSubstrings.length === 0) {
    return 1;
  }

  const allKqlLower = queryDetails.map((q) => q.kql.toLowerCase());

  const matchedCount = expectedSubstrings.filter((expectation) =>
    isExpectationSatisfied(expectation, allKqlLower)
  ).length;

  return matchedCount / expectedSubstrings.length;
};

/** Format a number as a percentage string */
export const formatPercent = (n: number): string => `${(n * 100).toFixed(0)}%`;

/** Build a human-readable reasoning string from the computed metrics */
export const buildMetricsReasoning = (metrics: SignificantEventsQualityMetrics): string => {
  const lines = [
    `overall: ${formatPercent(metrics.overallQuality)}`,
    `kql_syntax: ${formatPercent(metrics.syntaxValidityRate)}`,
    `execution_hits: ${formatPercent(metrics.executionHitRate)}`,
    `category_compliance: ${formatPercent(metrics.categoryComplianceRate)}`,
    `severity_compliance: ${formatPercent(metrics.severityComplianceRate)}`,
    `evidence_grounding: ${formatPercent(metrics.evidenceGroundingRate)}`,
    `title_quality: ${formatPercent(metrics.titleQualityRate)}`,
    `category_recall: ${formatPercent(metrics.categoryRecall)}`,
    `kql_substring_recall: ${formatPercent(metrics.kqlSubstringRecall)}`,
  ];
  return lines.join(' | ');
};

/**
 * Calculate overall significant events quality by combining all per-query
 * rates with ground truth recall scores.
 */
export const calculateSignificantEventsQuality = (
  queryDetails: QueryValidationDetail[],
  groundTruth: SignificantEventsGroundTruth
): SignificantEventsQualityMetrics => {
  const count = queryDetails.length;
  if (count === 0) {
    return {
      syntaxValidityRate: 0,
      executionHitRate: 0,
      categoryComplianceRate: 0,
      severityComplianceRate: 0,
      evidenceGroundingRate: 0,
      titleQualityRate: 0,
      categoryRecall: 0,
      kqlSubstringRecall: 0,
      overallQuality: 0,
    };
  }

  const rateByCheck = (check: CheckId): number =>
    queryDetails.filter((q) => q.checks.some((c) => c.check === check && c.passed)).length / count;

  const syntaxValidityRate = rateByCheck(CHECK_IDS.kqlSyntax);
  const executionHitRate = rateByCheck(CHECK_IDS.executionHit);
  const categoryComplianceRate = rateByCheck(CHECK_IDS.categoryCompliance);
  const severityComplianceRate = rateByCheck(CHECK_IDS.severityCompliance);
  const evidenceGroundingRate = rateByCheck(CHECK_IDS.evidenceGrounding);
  const titleQualityRate = rateByCheck(CHECK_IDS.titleQuality);

  const categoryRecall = calculateCategoryRecall(queryDetails, groundTruth.categories);
  const kqlSubstringRecall = calculateKqlSubstringRecall(queryDetails, groundTruth.kql_substrings);

  const overallQuality =
    syntaxValidityRate * WEIGHT_KQL_SYNTAX +
    executionHitRate * WEIGHT_EXECUTION_HITS +
    categoryRecall * WEIGHT_CATEGORY_RECALL +
    kqlSubstringRecall * WEIGHT_KQL_SUBSTRING_RECALL +
    categoryComplianceRate * WEIGHT_CATEGORY_COMPLIANCE +
    severityComplianceRate * WEIGHT_SEVERITY_COMPLIANCE +
    evidenceGroundingRate * WEIGHT_EVIDENCE_GROUNDING +
    titleQualityRate * WEIGHT_TITLE_QUALITY;

  return {
    syntaxValidityRate,
    executionHitRate,
    categoryComplianceRate,
    severityComplianceRate,
    evidenceGroundingRate,
    titleQualityRate,
    categoryRecall,
    kqlSubstringRecall,
    overallQuality,
  };
};
