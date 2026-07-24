/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate as evalsBase } from '@kbn/evals';
import { tags } from '@kbn/scout';
import { AgentBuilderEvaluationChatClient } from '../../src/chat_client';
import { skillSelectionEvaluator } from '../../src/skill_selection_evaluators';
import type { BenchmarkExample } from './benchmark_dataset';
import {
  ALERT_ANALYSIS_EXAMPLES,
  AUTOMATIC_TROUBLESHOOTING_EXAMPLES,
  DASHBOARD_MANAGEMENT_EXAMPLES,
  DETECTION_RULE_EDIT_EXAMPLES,
  ENTITY_ANALYTICS_EXAMPLES,
  FIND_RULES_EXAMPLES,
  FIND_SECURITY_ML_JOBS_EXAMPLES,
  GRAPH_CREATION_EXAMPLES,
  KI_IDENTIFICATION_MANAGEMENT_EXAMPLES,
  KNOWLEDGE_INDICATORS_MANAGEMENT_EXAMPLES,
  OBSERVABILITY_INVESTIGATION_EXAMPLES,
  SEARCH_CATALOG_ECOMMERCE_EXAMPLES,
  SEARCH_ELASTICSEARCH_ONBOARDING_EXAMPLES,
  SEARCH_ELASTICSEARCH_TUTORIAL_EXAMPLES,
  SEARCH_KEYWORD_SEARCH_EXAMPLES,
  SEARCH_RAG_CHATBOT_EXAMPLES,
  SEARCH_USE_CASE_LIBRARY_EXAMPLES,
  SEARCH_VECTOR_HYBRID_SEARCH_EXAMPLES,
  SERVICE_MAP_EXAMPLES,
  SIEM_READINESS_EXAMPLES,
  SIG_EVENTS_MANAGEMENT_EXAMPLES,
  SIG_EVENTS_MEMORY_EXAMPLES,
  SKILL_AUTHORING_EXAMPLES,
  STREAMS_MANAGEMENT_EXAMPLES,
  THREAT_HUNTING_EXAMPLES,
  VISUALIZATION_CREATION_EXAMPLES,
} from './benchmark_dataset';

// Use the native kbn-evals executor directly — no Phoenix dependency.
const base = evalsBase.extend<{}, { chatClient: AgentBuilderEvaluationChatClient }>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new AgentBuilderEvaluationChatClient(fetch, log, connector.id));
    },
    { scope: 'worker' },
  ],
});

// Lightweight task output — skill routing only, no correctness/groundedness overhead.
interface SkillRoutingTaskOutput {
  errors: unknown[];
  messages: Array<{ message: string }>;
  steps?: Array<Record<string, unknown>>;
  traceId?: string;
}

type EvaluateBenchmark = (params: {
  skillId: string;
  examples: BenchmarkExample[];
}) => Promise<void>;

const evaluate = base.extend<{}, { evaluateBenchmark: EvaluateBenchmark }>({
  evaluateBenchmark: [
    async ({ chatClient, executorClient }, use) => {
      await use(async ({ skillId, examples }) => {
        await executorClient.runExperiment(
          {
            datasets: [
              {
                name: `skill-selection-benchmark: ${skillId}`,
                description: `Skill routing benchmark for '${skillId}': direct queries (skill must load), indirect queries (problem-only phrasing), and distractor queries (cross-category confusion, skill must NOT load).`,
                examples,
              },
            ],
            task: async ({ input }) => {
              const response = await chatClient.converse({
                messages: [{ message: input.question }],
              });
              return {
                errors: response.errors,
                messages: response.messages,
                steps: response.steps,
                traceId: response.traceId,
              } satisfies SkillRoutingTaskOutput;
            },
          },
          [skillSelectionEvaluator]
        );
      });
    },
    { scope: 'worker' },
  ],
});

// ─── PLATFORM ────────────────────────────────────────────────────────────────

evaluate.describe(
  'Skill Selection Benchmark — Platform',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate('all platform skill routing', async ({ evaluateBenchmark }) => {
      await Promise.all([
        evaluateBenchmark({
          skillId: 'visualization-creation',
          examples: VISUALIZATION_CREATION_EXAMPLES,
        }),
        evaluateBenchmark({ skillId: 'graph-creation', examples: GRAPH_CREATION_EXAMPLES }),
        evaluateBenchmark({ skillId: 'skill-authoring', examples: SKILL_AUTHORING_EXAMPLES }),
        evaluateBenchmark({
          skillId: 'dashboard-management',
          examples: DASHBOARD_MANAGEMENT_EXAMPLES,
        }),
      ]);
    });
  }
);

// ─── STREAMS ────────────────────────────────────────────────────────────────

evaluate.describe(
  'Skill Selection Benchmark — Streams',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate('all streams skill routing', async ({ evaluateBenchmark }) => {
      await Promise.all([
        evaluateBenchmark({
          skillId: 'significant-events-memory',
          examples: SIG_EVENTS_MEMORY_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'streams-management',
          examples: STREAMS_MANAGEMENT_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'significant-events-management',
          examples: SIG_EVENTS_MANAGEMENT_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'knowledge-indicators-management',
          examples: KNOWLEDGE_INDICATORS_MANAGEMENT_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'ki-identification-management',
          examples: KI_IDENTIFICATION_MANAGEMENT_EXAMPLES,
        }),
      ]);
    });
  }
);

// ─── SECURITY ────────────────────────────────────────────────────────────────

evaluate.describe(
  'Skill Selection Benchmark — Security',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate('all security skill routing', async ({ evaluateBenchmark }) => {
      await Promise.all([
        evaluateBenchmark({ skillId: 'alert-analysis', examples: ALERT_ANALYSIS_EXAMPLES }),
        evaluateBenchmark({ skillId: 'threat-hunting', examples: THREAT_HUNTING_EXAMPLES }),
        evaluateBenchmark({ skillId: 'entity-analytics', examples: ENTITY_ANALYTICS_EXAMPLES }),
        evaluateBenchmark({
          skillId: 'detection-rule-edit',
          examples: DETECTION_RULE_EDIT_EXAMPLES,
        }),
        evaluateBenchmark({ skillId: 'find-security-rules', examples: FIND_RULES_EXAMPLES }),
        evaluateBenchmark({
          skillId: 'find-security-ml-jobs',
          examples: FIND_SECURITY_ML_JOBS_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'elastic-defend-configuration-troubleshooting',
          examples: AUTOMATIC_TROUBLESHOOTING_EXAMPLES,
        }),
        evaluateBenchmark({ skillId: 'siem-readiness', examples: SIEM_READINESS_EXAMPLES }),
      ]);
    });
  }
);

// ─── OBSERVABILITY ────────────────────────────────────────────────────────────

evaluate.describe(
  'Skill Selection Benchmark — Observability',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate('all observability skill routing', async ({ evaluateBenchmark }) => {
      await Promise.all([
        evaluateBenchmark({
          skillId: 'observability.investigation',
          examples: OBSERVABILITY_INVESTIGATION_EXAMPLES,
        }),
        evaluateBenchmark({ skillId: 'service-map', examples: SERVICE_MAP_EXAMPLES }),
      ]);
    });
  }
);

// ─── SEARCH ────────────────────────────────────────────────────────────────

evaluate.describe(
  'Skill Selection Benchmark — Search',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate('all search skill routing', async ({ evaluateBenchmark }) => {
      await Promise.all([
        evaluateBenchmark({
          skillId: 'search.elasticsearch-onboarding',
          examples: SEARCH_ELASTICSEARCH_ONBOARDING_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'search.elasticsearch-tutorial',
          examples: SEARCH_ELASTICSEARCH_TUTORIAL_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'search.keyword-search',
          examples: SEARCH_KEYWORD_SEARCH_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'search.vector-hybrid-search',
          examples: SEARCH_VECTOR_HYBRID_SEARCH_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'search.rag-chatbot',
          examples: SEARCH_RAG_CHATBOT_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'search.catalog-ecommerce',
          examples: SEARCH_CATALOG_ECOMMERCE_EXAMPLES,
        }),
        evaluateBenchmark({
          skillId: 'search.use-case-library',
          examples: SEARCH_USE_CASE_LIBRARY_EXAMPLES,
        }),
      ]);
    });
  }
);
