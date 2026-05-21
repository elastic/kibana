/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@playwright/test';
import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';
import { seedFindRulesFixtures } from './find_rules_fixtures';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Security Skills - Find Rules',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ kbnClient, esClient, log }) => {
      const seeded = await seedFindRulesFixtures({ kbnClient, esClient, log });
      teardown = seeded.cleanup;
    });

    evaluate.afterAll(async () => {
      if (teardown) await teardown();
    });

    evaluate(
      'rule-discovery queries activate the find-rules skill',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-find-rules-skill',
            description:
              'Validates multi-rule discovery queries with the array-of-arrays atomic-condition filter (outer OR, inner AND). Backed by 10 seeded rules + 50 synthetic alerts (30 → "Suspicious PowerShell Execution", 20 → "Brute Force Detection").',
            examples: [
              // ===== Basic metadata =====
              {
                input: {
                  question: 'List all enabled detection rules tagged with MITRE.',
                },
                output: {
                  criteria: [
                    'The response identifies exactly 5 detection rules.',
                    'The response names "Suspicious PowerShell Execution".',
                    'The response names "PowerShell Encoded Command".',
                    'The response names "Credential Access via LSASS".',
                    'The response names "Process Injection T1055".',
                    'The response names "PowerShell Network Scan".',
                    'The response does NOT include "Lateral Movement via SMB" (disabled).',
                    'The response does NOT include "Phishing URL Indicators" (disabled).',
                    'The model issues at least two `security.find_rules` calls: one with `groupBy: "tags"` to discover available tags, then one that filters the rule list.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'Across the calls, one invocation sets `groupBy: "tags"` to enumerate tag values (discovery step), and a separate invocation filters with an AND-group containing both `{ enabled: true }` and `{ tag: "MITRE" }` conditions.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },
              {
                input: {
                  question: 'How many custom (non-prebuilt) detection rules do I have enabled?',
                },
                output: {
                  criteria: ['The response reports a count of 8 enabled custom rules.'],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains one AND-group with both a `{ enabled: true }` condition and a `{ ruleSource: "custom" }` condition.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },
              {
                input: {
                  question: 'Show me query-type detection rules whose name contains "PowerShell".',
                },
                output: {
                  criteria: [
                    'The response identifies exactly 3 detection rules.',
                    'The response names "Suspicious PowerShell Execution".',
                    'The response names "PowerShell Encoded Command".',
                    'The response names "PowerShell Network Scan".',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains one AND-group with both a `{ ruleType: "query" }` condition and a `{ nameContains: "PowerShell" }` condition.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== Severity =====
              {
                input: {
                  question: 'Show me my critical severity detection rules.',
                },
                output: {
                  criteria: [
                    'The response identifies exactly 3 detection rules.',
                    'The response names "Suspicious PowerShell Execution".',
                    'The response names "Credential Access via LSASS".',
                    'The response names "Process Injection T1055".',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains an AND-group with a `{ severity: "critical" }` condition.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== Risk score range =====
              {
                input: {
                  question: 'List enabled detection rules with a risk score of 70 or higher.',
                },
                output: {
                  criteria: [
                    'The response identifies exactly 5 detection rules.',
                    'The response names "Suspicious PowerShell Execution".',
                    'The response names "PowerShell Encoded Command".',
                    'The response names "Credential Access via LSASS".',
                    'The response names "Custom DLL Loading Detection".',
                    'The response names "Process Injection T1055".',
                    'The response does NOT include "Lateral Movement via SMB" (disabled).',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains one AND-group with both a `{ enabled: true }` condition and a `{ riskScoreMin: 70 }` condition.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== MITRE structured technique =====
              {
                input: {
                  question: 'Show me detection rules covering MITRE technique T1059.',
                },
                output: {
                  criteria: [
                    'The response identifies exactly 2 detection rules.',
                    'The response names "Suspicious PowerShell Execution".',
                    'The response names "PowerShell Encoded Command".',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains an AND-group with a `{ mitreTechnique: "T1059" }` condition.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== OR within field (NEW for DNF) =====
              {
                input: {
                  question: 'Show me enabled critical OR high severity detection rules.',
                },
                output: {
                  criteria: [
                    'The response identifies exactly 5 detection rules.',
                    'The response names "Suspicious PowerShell Execution" (critical).',
                    'The response names "Credential Access via LSASS" (critical).',
                    'The response names "Process Injection T1055" (critical).',
                    'The response names "PowerShell Encoded Command" (high).',
                    'The response names "Custom DLL Loading Detection" (high).',
                    'The response does NOT include any medium-severity or low-severity rules.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains TWO AND-groups (OR semantics across the outer array): one with both `{ enabled: true }` and `{ severity: "critical" }`; the other with both `{ enabled: true }` and `{ severity: "high" }`.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== Cross-field OR groups (NEW for DNF) =====
              {
                input: {
                  question:
                    'Find detection rules that are either critical severity OR cover MITRE technique T1055.',
                },
                output: {
                  criteria: [
                    'The response identifies the 3 critical-severity rules: "Suspicious PowerShell Execution", "Credential Access via LSASS", "Process Injection T1055".',
                    'The response includes any T1055 rule (which is "Process Injection T1055" — already in the critical set).',
                    'Total distinct rules in the response is 3.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains TWO AND-groups (OR semantics across the outer array): one with a `{ severity: "critical" }` condition, the other with a `{ mitreTechnique: "T1055" }` condition.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== Exclusion =====
              {
                input: {
                  question: 'Show me MITRE-tagged detection rules that are NOT tagged "Custom".',
                },
                output: {
                  criteria: [
                    'The response includes "Suspicious PowerShell Execution".',
                    'The response includes "PowerShell Encoded Command".',
                    'The response does NOT include "Custom DLL Loading Detection" (excluded by Custom tag).',
                    'The model performs tag discovery via `groupBy: "tags"` before the filter/exclude call (any tag filter requires discovery).',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'One invocation sets `groupBy: "tags"` (discovery). A separate invocation has `filter` with a `{ tag: "MITRE" }` condition and `exclude` with a `{ tag: "Custom" }` condition.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== Sort by severity =====
              {
                input: {
                  question: 'List my top 3 enabled rules sorted by severity (most severe first).',
                },
                output: {
                  criteria: [
                    'The response lists exactly 3 rules.',
                    'The top 3 are critical-severity rules: "Suspicious PowerShell Execution", "Credential Access via LSASS", and "Process Injection T1055" (any order among the three).',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `sortField` argument equals "severity".',
                        'The `sortOrder` argument equals "desc".',
                        'The `perPage` argument is 3.',
                        'The `filter` argument scopes to enabled rules.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== Disabled rules =====
              {
                input: {
                  question: 'Show me my disabled detection rules.',
                },
                output: {
                  criteria: [
                    'The response identifies exactly 2 detection rules.',
                    'The response names "Lateral Movement via SMB".',
                    'The response names "Phishing URL Indicators".',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains an AND-group with a `{ enabled: false }` condition.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== Empty result (tag doesn't exist in the space) =====
              {
                input: {
                  question: 'List detection rules tagged with "NonExistentTag".',
                },
                output: {
                  criteria: [
                    'The response indicates that no rules match (zero results) OR that no tag matching "NonExistentTag" was found in this space.',
                    'The response does not fabricate rule names.',
                    'The model issues a `security.find_rules` call with `groupBy: "tags"` to discover available tags — the "NonExistentTag" can only be confirmed absent via discovery.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'At least one invocation sets `groupBy: "tags"` to enumerate available tag values. The model may or may not issue a second invocation filtering by `{ tag: "NonExistentTag" }` — either is acceptable; what is NOT acceptable is skipping discovery entirely.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                },
              },

              // ===== Alert volume (UUID translation path) =====
              {
                input: {
                  question:
                    'Which 10 detection rules generated the most alerts in the last 24 hours?',
                },
                output: {
                  criteria: [
                    'The response ranks "Suspicious PowerShell Execution" as the top rule by alert count.',
                    'The response reports 30 alerts for "Suspicious PowerShell Execution".',
                    'The response ranks "Brute Force Detection" second.',
                    'The response reports 20 alerts for "Brute Force Detection".',
                    'The model aggregates alerts by `kibana.alert.rule.uuid` (NOT by rule name) and then translates the top UUIDs back to rule names via `security.find_rules` with `{ ruleUuid: "<uuid>" }` conditions.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.alerts',
                      criteria: [
                        'The query aggregates alerts grouped by `kibana.alert.rule.uuid` (not by name), scoped to the last 24 hours.',
                      ],
                    },
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains one or more AND-groups, each with a single `{ ruleUuid: "<uuid>" }` condition — used to translate the top UUIDs from the alerts aggregation back into rule names and metadata.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Noisy Rules',
                  expectedSkill: 'find-rules',
                },
              },
              {
                input: {
                  question: 'Show me my noisiest detection rules this week.',
                },
                output: {
                  criteria: [
                    'The response ranks "Suspicious PowerShell Execution" as the noisiest rule.',
                    'The response reports 30 alerts for "Suspicious PowerShell Execution".',
                    'The response ranks "Brute Force Detection" second with 20 alerts.',
                    'The model aggregates alerts by `kibana.alert.rule.uuid` and translates the top UUIDs back to rules via `security.find_rules` with `{ ruleUuid: "<uuid>" }` conditions.',
                  ],
                  toolCalls: [
                    {
                      id: 'security.alerts',
                      criteria: [
                        'The query aggregates alerts by `kibana.alert.rule.uuid` (not by name) over the past 7 days.',
                      ],
                    },
                    {
                      id: 'security.find_rules',
                      criteria: [
                        'The `filter` argument contains AND-groups with `{ ruleUuid: "<uuid>" }` conditions translating the top UUIDs into rule names.',
                      ],
                    },
                  ],
                },
                metadata: {
                  query_intent: 'Noisy Rules',
                  expectedSkill: 'find-rules',
                },
              },
            ],
          },
        });
      }
    );
  }
);

evaluate.describe(
  'Security Skills - Find Rules Boundaries',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'rule-adjacent queries do NOT activate find-rules and route to the correct sibling skill',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-find-rules-distractors',
            description:
              'Distractor queries that touch rule-related vocabulary but should activate a different skill (alert-analysis, threat-hunting, entity-analytics, find-security-ml-jobs, detection-rule-edit, rule-management).',
            examples: [
              {
                input: {
                  question:
                    'Why did alert abc123 fire? Help me triage it and check related activity.',
                },
                output: {
                  criteria: [
                    'The response addresses triage of a specific alert.',
                    'The response does not list multiple unrelated detection rules.',
                  ],
                },
                metadata: {
                  query_intent: 'Alert Triage',
                  expectedSkill: 'alert-analysis',
                },
              },
              {
                input: {
                  question:
                    'Hunt for lateral movement across our hosts in the last 7 days using suspicious logon types.',
                },
                output: {
                  criteria: [
                    'The response describes an ES|QL-based hunt for lateral movement.',
                    'The response does not list multiple detection rules as the primary answer.',
                  ],
                },
                metadata: {
                  query_intent: 'Threat Hunting',
                  expectedSkill: 'threat-hunting',
                },
              },
              {
                input: {
                  question: 'What is the risk score for host srv-01 and has it changed recently?',
                },
                output: {
                  criteria: [
                    'The response addresses the risk score for host srv-01.',
                    'The response does not list multiple detection rules.',
                  ],
                },
                metadata: {
                  query_intent: 'Risk Assessment',
                  expectedSkill: 'entity-analytics',
                },
              },
              {
                input: {
                  question: 'Which ML jobs have anomalies in the last 24 hours?',
                },
                output: {
                  criteria: ['The response addresses ML jobs and anomalies, not detection rules.'],
                },
                metadata: {
                  query_intent: 'ML Anomalies',
                  expectedSkill: 'find-security-ml-jobs',
                },
              },
              {
                input: {
                  question: "Disable the rule 'Suspicious PowerShell Execution'.",
                },
                output: {
                  criteria: [
                    'The response addresses editing or disabling a single rule, not listing rules.',
                    'The response does not return a list of multiple rules as the primary action.',
                  ],
                },
                metadata: {
                  query_intent: 'Rule Editing',
                  expectedSkill: 'detection-rule-edit',
                },
              },
              {
                input: {
                  question:
                    'Show me my alerting V2 rules with ES|QL queries that monitor system CPU.',
                },
                output: {
                  criteria: [
                    'The response addresses alerting V2 rules (not Security detection rules).',
                  ],
                },
                metadata: {
                  query_intent: 'V2 Rule Discovery',
                  expectedSkill: 'rule-management',
                },
              },
            ],
          },
        });
      }
    );
  }
);

evaluate.describe(
  'Security Skills - Find Rules Multi-Turn',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ kbnClient, esClient, log }) => {
      const seeded = await seedFindRulesFixtures({ kbnClient, esClient, log });
      teardown = seeded.cleanup;
    });

    evaluate.afterAll(async () => {
      if (teardown) await teardown();
    });

    evaluate(
      'second-turn refinement re-invokes find_rules instead of filtering from memory',
      async ({ chatClient }) => {
        // Turn 1: broad query.
        const turn1 = await chatClient.converse({
          messages: [{ message: 'List all enabled detection rules tagged with MITRE.' }],
        });

        expect(turn1.errors).toEqual([]);
        expect(turn1.conversationId).toBeDefined();

        // Turn 2: refinement that depends on turn 1's context. The model MUST re-call
        // `security.find_rules` with a narrower filter, not paraphrase the prior list.
        const turn2 = await chatClient.converse({
          messages: [{ message: 'Now narrow that down to just the critical severity ones.' }],
          conversationId: turn1.conversationId,
        });

        expect(turn2.errors).toEqual([]);

        const turn2ToolCalls = (turn2.steps ?? []).filter(
          (step: { type?: string; tool_id?: string }) =>
            step.type === 'tool_call' && step.tool_id === 'security.find_rules'
        );
        expect(turn2ToolCalls.length).toBeGreaterThan(0);

        // The model MUST carry the turn-1 MITRE constraint into turn 2 — otherwise the
        // refinement ("just the critical severity ones") would degenerate into a brand-new
        // unscoped "all critical rules" listing. Inspect the serialized tool args of every
        // turn-2 `security.find_rules` call (excluding the always-present `groupBy:"tags"`
        // discovery call) and require at least one filter call that mentions BOTH "MITRE"
        // (context preserved) and "critical" (turn-2 narrowing applied).
        const turn2FilterCallArgs = turn2ToolCalls
          .map((step: { params?: unknown }) => JSON.stringify(step.params ?? {}))
          .filter((args: string) => !args.includes('"groupBy"'));
        expect(turn2FilterCallArgs.length).toBeGreaterThan(0);
        const carriedMitreAndCritical = turn2FilterCallArgs.some(
          (args: string) => args.includes('"MITRE"') && args.includes('"critical"')
        );
        expect(carriedMitreAndCritical).toBe(true);

        const lastMessage = turn2.messages[turn2.messages.length - 1]?.message ?? '';
        expect(lastMessage.toLowerCase()).toContain('critical');

        // Seeded fixture has 3 enabled critical+MITRE rules — at least one must surface.
        const criticalMitreRuleNames = [
          'Suspicious PowerShell Execution',
          'Credential Access via LSASS',
          'Process Injection T1055',
        ];
        const mentionedCritical = criticalMitreRuleNames.some((n) => lastMessage.includes(n));
        expect(mentionedCritical).toBe(true);

        // The tool-call args check above (carriedMitreAndCritical) is the authoritative
        // validation that high-severity rules were filtered out at query time. We avoid
        // asserting on message text here because the model may legitimately mention
        // excluded rules in a comparison/context sentence while still returning the
        // correct critical-only set.
      }
    );
  }
);
