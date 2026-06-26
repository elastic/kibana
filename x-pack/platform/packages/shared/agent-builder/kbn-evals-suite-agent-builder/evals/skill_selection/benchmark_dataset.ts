/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Skill-selection benchmark dataset — parsed at runtime from benchmark_dataset.csv.
 *
 * Adding or modifying examples requires only editing the CSV — this file stays untouched.
 *
 * CSV columns: skill_id, category, query, query_type, expected_skill, notes
 *
 * Query types:
 *   direct     — query that explicitly calls for this skill
 *   indirect   — describes the problem without naming the skill domain
 *   distractor — sounds similar to a neighbouring skill but should NOT trigger this one
 *
 * Ground truth wiring (in `output`, read by evaluators via the `expected` parameter):
 *   direct/indirect  → expectedSkill = skill_id  (the skill must load)
 *   distractor       → shouldNotActivateSkill = skill_id  (the skill must NOT load)
 *
 * Descriptive metadata (in `metadata`, for human understanding only):
 *   skillId, category, queryType, notes
 */

import * as fs from 'fs';
import * as path from 'path';

type QueryType = 'direct' | 'indirect' | 'distractor';

export interface BenchmarkExample {
  input: { question: string };
  /** Ground truth annotations — read by evaluators via the `expected` param. */
  output: {
    expectedSkill?: string;
    shouldNotActivateSkill?: string;
  };
  /** Descriptive metadata — enriches human understanding of the example only. */
  metadata: {
    skillId: string;
    category: string;
    queryType: QueryType;
    notes?: string;
  };
}

function parseCsv(): BenchmarkExample[] {
  const csvPath = path.join(__dirname, 'benchmark_dataset.csv');
  const lines = fs
    .readFileSync(csvPath, 'utf-8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('skill_id'));

  return lines.map((line) => {
    // Anchor on query_type values to correctly handle any commas within the query text.
    const match = line.match(/^([^,]+),([^,]+),(.+),(direct|indirect|distractor),([^,]*),(.*)$/);
    if (!match) {
      throw new Error(`Failed to parse CSV row: ${line}`);
    }

    const [, skillId, category, query, queryType, , notes] = match;
    const queryTyped = queryType as QueryType;

    return {
      input: { question: query.trim() },
      output:
        queryTyped === 'distractor'
          ? { shouldNotActivateSkill: skillId }
          : { expectedSkill: skillId },
      metadata: {
        skillId,
        category,
        queryType: queryTyped,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      },
    };
  });
}

const ALL_EXAMPLES: BenchmarkExample[] = parseCsv();

const bySkill = (skillId: string): BenchmarkExample[] =>
  ALL_EXAMPLES.filter((e) => e.metadata.skillId === skillId);

// ─── PLATFORM ───────────────────────────────────────────────────────────────

export const DASHBOARD_MANAGEMENT_EXAMPLES = bySkill('dashboard-management');
export const GRAPH_CREATION_EXAMPLES = bySkill('graph-creation');
export const SKILL_AUTHORING_EXAMPLES = bySkill('skill-authoring');
export const VISUALIZATION_CREATION_EXAMPLES = bySkill('visualization-creation');

// ─── STREAMS ────────────────────────────────────────────────────────────────

export const KI_IDENTIFICATION_MANAGEMENT_EXAMPLES = bySkill('ki-identification-management');
export const KNOWLEDGE_INDICATORS_MANAGEMENT_EXAMPLES = bySkill('knowledge-indicators-management');
export const SIG_EVENTS_MANAGEMENT_EXAMPLES = bySkill('sig-events-management');
export const SIG_EVENTS_MEMORY_EXAMPLES = bySkill('sig-events-memory');
export const STREAMS_MANAGEMENT_EXAMPLES = bySkill('streams-management');

// ─── SECURITY ───────────────────────────────────────────────────────────────

export const ALERT_ANALYSIS_EXAMPLES = bySkill('alert-analysis');
export const AUTOMATIC_TROUBLESHOOTING_EXAMPLES = bySkill(
  'elastic-defend-configuration-troubleshooting'
);
export const DETECTION_RULE_EDIT_EXAMPLES = bySkill('detection-rule-edit');
export const ENTITY_ANALYTICS_EXAMPLES = bySkill('entity-analytics');
export const FIND_RULES_EXAMPLES = bySkill('find-security-rules');
export const FIND_SECURITY_ML_JOBS_EXAMPLES = bySkill('find-security-ml-jobs');
export const SIEM_READINESS_EXAMPLES = bySkill('siem-readiness');
export const THREAT_HUNTING_EXAMPLES = bySkill('threat-hunting');

// ─── OBSERVABILITY ──────────────────────────────────────────────────────────

export const OBSERVABILITY_INVESTIGATION_EXAMPLES = bySkill('observability.investigation');
export const SERVICE_MAP_EXAMPLES = bySkill('service-map');

// ─── SEARCH ─────────────────────────────────────────────────────────────────

export const SEARCH_CATALOG_ECOMMERCE_EXAMPLES = bySkill('search.catalog-ecommerce');
export const SEARCH_ELASTICSEARCH_ONBOARDING_EXAMPLES = bySkill('search.elasticsearch-onboarding');
export const SEARCH_ELASTICSEARCH_TUTORIAL_EXAMPLES = bySkill('search.elasticsearch-tutorial');
export const SEARCH_KEYWORD_SEARCH_EXAMPLES = bySkill('search.keyword-search');
export const SEARCH_RAG_CHATBOT_EXAMPLES = bySkill('search.rag-chatbot');
export const SEARCH_USE_CASE_LIBRARY_EXAMPLES = bySkill('search.use-case-library');
export const SEARCH_VECTOR_HYBRID_SEARCH_EXAMPLES = bySkill('search.vector-hybrid-search');
