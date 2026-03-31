/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmFeature } from './features_tool';

// ---------------------------------------------------------------------------
// Field detection patterns
// ---------------------------------------------------------------------------

const SEVERITY_FIELD_PATTERNS = ['log.level', 'log.severity', 'severity', 'level'];
const HTTP_STATUS_FIELD_PATTERNS = ['http.response.status_code', 'http.status_code'];
const ENTITY_FIELD_PATTERNS = [
  'service.name',
  'host.name',
  'kubernetes.pod.name',
  'container.name',
  'cloud.instance.id',
];

interface DurationFieldCandidate {
  field: string;
  unitNote: string;
}

// Only structured (dot-delimited or underscore-delimited) field names to avoid
// false positives from prose matches. Short names like 'duration' or 'latency'
// would match analysis text like "the duration of this window was 15 minutes."
const DURATION_FIELD_CANDIDATES: DurationFieldCandidate[] = [
  {
    field: 'event.duration',
    unitNote: 'Unit: nanoseconds (ECS). Divide by 1,000,000 to get milliseconds in EVAL.',
  },
  {
    field: 'transaction.duration.us',
    unitNote: 'Unit: microseconds. Divide by 1,000 to get milliseconds in EVAL.',
  },
  { field: 'http.response.time', unitNote: 'Check dataset_analysis for actual unit.' },
  { field: 'response_time', unitNote: 'Check dataset_analysis for actual unit.' },
];

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ENTITY_CARDINALITY = 50;
const BASELINE_MULTIPLIER = 2;
const MIN_SAMPLE_SIZE = 20;
const COMPONENT_MIN_SAMPLE_SIZE = 10;
const DEFAULT_ERROR_PCT = 5;
const DEFAULT_HTTP_ERROR_RATE = 5;
const DEFAULT_COMPONENT_ERROR_RATE = 10;
const FIELD_SECTION_SCAN_LENGTH = 500;
const CARDINALITY_SCAN_LENGTH = 300;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface StatsPattern {
  id: string;
  title: string;
  body: string;
}

/**
 * Best-effort field detection: scans the `dataset_analysis` text for known
 * field name patterns. This is inherently fragile since `analysis` is
 * unstructured LLM output, but sufficient for threshold heuristics.
 */
function findFieldInAnalysis(analysis: string, patterns: string[]): string | undefined {
  for (const pattern of patterns) {
    if (analysis.includes(pattern)) {
      return pattern;
    }
  }
  return undefined;
}

function findDurationField(analysis: string): DurationFieldCandidate | undefined {
  for (const candidate of DURATION_FIELD_CANDIDATES) {
    if (analysis.includes(candidate.field)) {
      return candidate;
    }
  }
  return undefined;
}

function extractErrorPercentage(analysis: string, severityField: string): number | undefined {
  const fieldSection = analysis.split(severityField);
  if (fieldSection.length < 2) return undefined;

  const afterField = fieldSection[1].substring(0, FIELD_SECTION_SCAN_LENGTH);
  const errorMatch = afterField.match(/error[^0-9]*?(\d+(?:\.\d+)?)\s*%/i);
  if (errorMatch) {
    return parseFloat(errorMatch[1]);
  }
  return undefined;
}

function extractEntityCardinality(analysis: string, entityField: string): number | undefined {
  const fieldSection = analysis.split(entityField);
  if (fieldSection.length < 2) return undefined;

  const afterField = fieldSection[1].substring(0, CARDINALITY_SCAN_LENGTH);
  const cardMatch = afterField.match(/(\d+)\s*(?:distinct|unique|values)/i);
  if (cardMatch) {
    return parseInt(cardMatch[1], 10);
  }
  return undefined;
}

/**
 * Scans `log_patterns` features for patterns that mention error-related
 * keywords, returning a brief note for the LLM if any are found.
 * This helps the LLM choose which error signatures to aggregate.
 */
function extractLogPatternContext(logPatternFeatures: LlmFeature[]): string | undefined {
  if (logPatternFeatures.length === 0) return undefined;

  const errorKeywords = ['error', 'fail', 'timeout', 'refused', 'exception', 'crash', 'fatal'];
  const relevantPatterns: string[] = [];

  for (const feature of logPatternFeatures) {
    const patternText =
      typeof feature.properties?.pattern === 'string'
        ? feature.properties.pattern
        : feature.title ?? '';

    const lowerText = patternText.toLowerCase();
    if (errorKeywords.some((kw) => lowerText.includes(kw)) && patternText.length > 0) {
      relevantPatterns.push(patternText);
    }
  }

  if (relevantPatterns.length === 0) return undefined;

  const truncated = relevantPatterns.slice(0, 3);
  return [
    `LOG PATTERN CONTEXT:`,
    `The following recurring error patterns were detected in the logs:`,
    ...truncated.map((p) => `  - "${p}"`),
    relevantPatterns.length > 3
      ? `  (${relevantPatterns.length - 3} additional error patterns omitted)`
      : '',
    `Consider these patterns when choosing which error signatures to aggregate.`,
    `A STATS query counting occurrences of a specific high-frequency pattern`,
    `can detect when that failure mode accelerates beyond normal baseline.`,
  ]
    .filter(Boolean)
    .join('\n');
}

function roundThreshold(value: number): number {
  if (value >= 100) return Math.ceil(value / 10) * 10;
  if (value >= 10) return Math.ceil(value);
  return Math.ceil(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Analyzes LLM features to determine if STATS queries are viable and
 * builds contextual guidance with field-specific patterns and thresholds.
 *
 * Returns `null` when no field-specific pattern applies (e.g., no severity
 * field, no HTTP status codes, no duration fields detected).
 *
 * Patterns are split into two categories:
 * - **Field-specific**: require evidence of a particular field in the data
 *   (error rate, HTTP error rate, latency, component degradation).
 * - **Generic**: always applicable when dataset_analysis is present
 *   (traffic spike, traffic drop).
 *
 * The gate requires at least one field-specific pattern before producing
 * guidance, ensuring we only suggest STATS queries when meaningful
 * aggregation targets exist.
 */
export function buildStatsGuidance(features: LlmFeature[]): string | null {
  const datasetFeature = features.find((f) => f.type === 'dataset_analysis');
  const entityFeatures = features.filter((f) => f.type === 'entity');
  const logPatternFeatures = features.filter((f) => f.type === 'log_patterns');

  if (!datasetFeature) return null;

  const analysis =
    typeof datasetFeature.properties?.analysis === 'string'
      ? datasetFeature.properties.analysis
      : '';

  if (!analysis) return null;

  const fieldSpecificPatterns: StatsPattern[] = [];
  const genericPatterns: StatsPattern[] = [];

  // --- Field-specific pattern: Error rate ---
  const severityField = findFieldInAnalysis(analysis, SEVERITY_FIELD_PATTERNS);
  if (severityField) {
    const observedPct = extractErrorPercentage(analysis, severityField) ?? DEFAULT_ERROR_PCT;
    const threshold = roundThreshold(observedPct * BASELINE_MULTIPLIER);

    fieldSpecificPatterns.push({
      id: 'error-rate',
      title: 'Service Error Rate Degradation',
      body: [
        `  Observed: ${severityField} ERROR at ~${observedPct}%.`,
        `  Suggested threshold: error_rate > ${threshold}% (${BASELINE_MULTIPLIER}x baseline).`,
        `  Template:`,
        `    FROM <stream>`,
        `    | STATS errors = COUNT(*) WHERE ${severityField} == "ERROR", total = COUNT(*)`,
        `      BY bucket = BUCKET(@timestamp, 5 minutes)`,
        `    | EVAL error_rate = errors * 100.0 / total`,
        `    | WHERE total > ${MIN_SAMPLE_SIZE} AND error_rate > ${threshold}`,
      ].join('\n'),
    });
  }

  // --- Field-specific pattern: HTTP error rate ---
  const httpStatusField = findFieldInAnalysis(analysis, HTTP_STATUS_FIELD_PATTERNS);
  if (httpStatusField) {
    const observedHttpPct =
      extractErrorPercentage(analysis, httpStatusField) ?? DEFAULT_HTTP_ERROR_RATE;
    const httpThreshold = roundThreshold(observedHttpPct * BASELINE_MULTIPLIER);

    fieldSpecificPatterns.push({
      id: 'http-error-rate',
      title: 'HTTP Error Rate',
      body: [
        `  Observed: ${httpStatusField} present in data (~${observedHttpPct}% 5xx).`,
        `  Suggested threshold: error_rate > ${httpThreshold}% (${BASELINE_MULTIPLIER}x baseline).`,
        `  Template:`,
        `    FROM <stream>`,
        `    | STATS errors = COUNT(*) WHERE ${httpStatusField} >= 500, total = COUNT(*)`,
        `      BY bucket = BUCKET(@timestamp, 5 minutes)`,
        `    | EVAL error_rate = errors * 100.0 / total`,
        `    | WHERE total > ${MIN_SAMPLE_SIZE} AND error_rate > ${httpThreshold}`,
      ].join('\n'),
    });
  }

  // --- Field-specific pattern: Latency degradation ---
  const durationCandidate = findDurationField(analysis);
  if (durationCandidate) {
    fieldSpecificPatterns.push({
      id: 'latency-degradation',
      title: 'Latency Degradation (P95)',
      body: [
        `  Observed: ${durationCandidate.field} present in data.`,
        `  ${durationCandidate.unitNote}`,
        `  Latency spikes are often the earliest user-visible symptom, preceding error rate increases.`,
        `  Template:`,
        `    FROM <stream>`,
        `    | STATS p95 = PERCENTILE(${durationCandidate.field}, 95)`,
        `      BY bucket = BUCKET(@timestamp, 5 minutes)`,
        `    | WHERE p95 > <threshold_in_field_units>`,
        `  Set <threshold_in_field_units> to 2-3x the observed typical P95. Check dataset_analysis for`,
        `  representative values. For example, if typical P95 is 200ms and the field is in nanoseconds,`,
        `  the threshold would be 600000000 (600ms in ns).`,
      ].join('\n'),
    });
  }

  // --- Field-specific pattern: Component-level degradation ---
  let entityField: string | undefined;
  let entityCardinality: number | undefined;

  for (const ef of entityFeatures) {
    const candidateField =
      typeof ef.properties?.field === 'string'
        ? ef.properties.field
        : findFieldInAnalysis(analysis, ENTITY_FIELD_PATTERNS);

    if (!candidateField) continue;

    const cardinality = extractEntityCardinality(analysis, candidateField);
    if (cardinality && cardinality <= MAX_ENTITY_CARDINALITY) {
      entityField = candidateField;
      entityCardinality = cardinality;
      break;
    }

    if (!cardinality) {
      entityField = candidateField;
      break;
    }
  }

  if (entityField && severityField) {
    const cardinalityNote = entityCardinality
      ? `  Entity field: ${entityField} with ${entityCardinality} distinct values.`
      : `  Entity field: ${entityField}.`;

    fieldSpecificPatterns.push({
      id: 'component-degradation',
      title: 'Component-Level Degradation',
      body: [
        cardinalityNote,
        `  Per-component sample size is lower (${COMPONENT_MIN_SAMPLE_SIZE}) because each entity receives fewer events.`,
        `  Template:`,
        `    FROM <stream>`,
        `    | STATS errors = COUNT(*) WHERE ${severityField} IN ("ERROR", "CRITICAL"),`,
        `            total = COUNT(*)`,
        `      BY ${entityField}, bucket = BUCKET(@timestamp, 5 minutes)`,
        `    | EVAL error_rate = errors * 100.0 / total`,
        `    | WHERE total > ${COMPONENT_MIN_SAMPLE_SIZE} AND error_rate > ${DEFAULT_COMPONENT_ERROR_RATE}`,
      ].join('\n'),
    });
  }

  // --- Generic pattern: Traffic drop (silent failure) ---
  genericPatterns.push({
    id: 'traffic-drop',
    title: 'Traffic Drop (Silent Failure)',
    body: [
      `  Detects when event volume drops to near-zero, indicating a service crash,`,
      `  network partition, or routing failure. Often more critical than traffic spikes`,
      `  because it means the system stopped responding entirely.`,
      `  Template:`,
      `    FROM <stream>`,
      `    | STATS event_count = COUNT(*)`,
      `      BY bucket = BUCKET(@timestamp, 5 minutes)`,
      `    | WHERE event_count < <low_threshold>`,
      `  Set <low_threshold> to ~10% of expected events per bucket. Check dataset_analysis`,
      `  for typical event volume. A very conservative (low) threshold is preferred — this`,
      `  should only fire when the service is genuinely silent.`,
    ].join('\n'),
  });

  // --- Generic pattern: Traffic spike ---
  genericPatterns.push({
    id: 'traffic-spike',
    title: 'Abnormal Traffic Spike',
    body: [
      `  Detects unexpected surges in event volume that may indicate a DDoS,`,
      `  retry storm, or cascading failure generating excessive logging.`,
      `  Template:`,
      `    FROM <stream>`,
      `    | STATS event_count = COUNT(*)`,
      `      BY bucket = BUCKET(@timestamp, 5 minutes)`,
      `    | WHERE event_count > <high_threshold>`,
      `  Set <high_threshold> to 3-5x normal event volume per bucket.`,
    ].join('\n'),
  });

  // Gate: require at least one field-specific pattern.
  // Generic patterns alone (traffic spike/drop) are not enough signal
  // to justify STATS query generation — they lack concrete field evidence.
  if (fieldSpecificPatterns.length === 0) return null;

  const allPatterns = [...fieldSpecificPatterns, ...genericPatterns];
  const patternLines = allPatterns.map((p) => `[${p.id}] ${p.title}\n${p.body}`).join('\n\n');

  const logPatternContext = extractLogPatternContext(logPatternFeatures);

  return [
    `--- STATS QUERY GUIDANCE ---`,
    ``,
    `Based on the features above, the following STATS query patterns are applicable:`,
    ``,
    `STRUCTURE: FROM <stream> | [WHERE pre-filter] | STATS <aggregations> [WHERE <per-agg-filter>] BY <grouping> | [EVAL <computed>] | WHERE <threshold>`,
    ``,
    `Per-aggregation WHERE: Each aggregation can have its own WHERE clause.`,
    `  errors = COUNT(*) WHERE log.level == "ERROR" counts only ERROR rows.`,
    `  total = COUNT(*) without WHERE counts ALL rows.`,
    `  These are independent within the same STATS command.`,
    ``,
    `APPLICABLE PATTERNS:`,
    ``,
    patternLines,
    ``,
    ...(logPatternContext ? [logPatternContext, ``] : []),
    `SIGNAL DIVERSITY:`,
    `Prioritize patterns that cover DIFFERENT failure modes. A good set detects`,
    `error-rate increases AND latency degradation AND traffic anomalies — not just`,
    `error-rate measured multiple ways. Choose the 1-3 most impactful patterns for`,
    `this stream. Do not generate one query per pattern.`,
    ``,
    `BUCKET SIZE:`,
    `Templates default to 5-minute buckets. Adjust based on traffic volume:`,
    `  Low traffic (<100 events/min): use 10-15 minute buckets for statistical significance.`,
    `  High traffic (>1000 events/min): 1-2 minute buckets detect issues faster.`,
    `Check dataset_analysis for event volume clues. The rule executor runs every 1 minute.`,
    ``,
    `DESCRIPTION REQUIREMENTS:`,
    `Every STATS description MUST answer:`,
    `  (1) What user-visible problem does this detect?`,
    `  (2) What action should the responder take?`,
    `  (3) What is the threshold reasoning relative to the observed baseline?`,
    `  (4) Note that thresholds are calibrated from a data snapshot and may need`,
    `      user adjustment if the system was already degraded during analysis.`,
    `Write as if briefing an on-call SRE.`,
    ``,
    `SEVERITY CALIBRATION:`,
    `Consider BOTH the relative deviation AND the absolute resulting value:`,
    `  severity_score 70-100: resulting value causes user-visible impact`,
    `    (e.g., 40% error rate, P95 > 5s response time, near-zero traffic)`,
    `  severity_score 40-69: noticeable degradation without immediate user impact`,
    `    (e.g., 2x baseline error rate that stays under 5%, latency up 50%)`,
    `  Below severity 40: signal may not be worth generating.`,
    `A 5x increase from 0.1% to 0.5% error rate is severity ~40 (minor noise).`,
    `A 2x increase from 20% to 40% error rate is severity ~85 (service-level impact).`,
    `The absolute magnitude matters as much as the multiplier.`,
    ``,
    `TARGET: 1-3 high-value STATS queries. Zero is acceptable. Quality over quantity.`,
    `--- END STATS GUIDANCE ---`,
  ].join('\n');
}
