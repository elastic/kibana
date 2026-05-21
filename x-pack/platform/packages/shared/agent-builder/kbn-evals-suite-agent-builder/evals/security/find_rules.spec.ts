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
              {
                input: {
                  question: 'List all enabled detection rules tagged with MITRE.',
                },
                output: {
                  expected:
                    'The response lists enabled detection rules carrying a MITRE tag. The results include "Suspicious PowerShell Execution" (critical, risk 99), "PowerShell Encoded Command" (high, risk 73), "Credential Access via LSASS" (critical, risk 95), "Process Injection T1055" (critical, risk 95), and "PowerShell Network Scan" (medium, risk 47). Disabled MITRE-tagged rules such as "Lateral Movement via SMB" and "Phishing URL Indicators" are excluded.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.discover_rule_tags', 'security.find_rules'],
                },
              },
              {
                input: {
                  question: 'How many custom (non-prebuilt) detection rules do I have enabled?',
                },
                output: {
                  expected:
                    'The response states the total count of enabled custom (non-prebuilt) detection rules, derived from the find-rules tool total field. The count is 8.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'How many detection rules are enabled vs disabled?',
                },
                output: {
                  expected:
                    'The response provides separate counts for enabled and disabled detection rules. There are 8 enabled and 2 disabled rules. The find-rules tool was called at least twice with different enabled filters.',
                },
                metadata: {
                  query_intent: 'Rule Count Breakdown',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me query-type detection rules whose name contains "PowerShell".',
                },
                output: {
                  expected:
                    'The response lists query-type rules with "PowerShell" in the name. The results include "Suspicious PowerShell Execution" (critical, risk 99), "PowerShell Encoded Command" (high, risk 73), and "PowerShell Network Scan" (medium, risk 47). All three are query-type and enabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me my network detection rules.',
                },
                output: {
                  expected:
                    'The response lists network-related detection rules identified via tag discovery. The results include "Lateral Movement via SMB" (high, disabled), "Brute Force Detection" (medium, enabled), "Anomalous DNS Activity" (medium, enabled), and "Phishing URL Indicators" (low, disabled). Tags containing "Network" were discovered first.',
                },
                metadata: {
                  query_intent: 'Semantic Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.discover_rule_tags', 'security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me my critical severity detection rules.',
                },
                output: {
                  expected:
                    'The response lists critical severity detection rules. The results include "Suspicious PowerShell Execution" (risk 99), "Credential Access via LSASS" (risk 95), and "Process Injection T1055" (risk 95). All three are enabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'List enabled detection rules with a risk score of 70 or higher.',
                },
                output: {
                  expected:
                    'The response lists enabled rules with risk_score >= 70. The results include "Suspicious PowerShell Execution" (critical, risk 99), "Credential Access via LSASS" (critical, risk 95), "Process Injection T1055" (critical, risk 95), "PowerShell Encoded Command" (high, risk 73), and "Custom DLL Loading Detection" (high, risk 70). "Lateral Movement via SMB" (risk 70) is excluded because it is disabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me detection rules covering MITRE technique T1059.',
                },
                output: {
                  expected:
                    'The response lists rules mapped to MITRE technique T1059. The results include "Suspicious PowerShell Execution" (critical, query) and "PowerShell Encoded Command" (high, query). Both are enabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me enabled critical OR high severity detection rules.',
                },
                output: {
                  expected:
                    'The response lists enabled rules with critical or high severity. Critical: "Suspicious PowerShell Execution" (risk 99), "Credential Access via LSASS" (risk 95), "Process Injection T1055" (risk 95). High: "PowerShell Encoded Command" (risk 73), "Custom DLL Loading Detection" (risk 70). Medium and low severity rules are excluded.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question:
                    'Find detection rules that are either critical severity OR cover MITRE technique T1055.',
                },
                output: {
                  expected:
                    'The response lists rules matching critical severity or MITRE T1055. The results include "Suspicious PowerShell Execution" (critical), "Credential Access via LSASS" (critical), and "Process Injection T1055" (critical, also mapped to T1055). All three are enabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me MITRE-tagged detection rules that are NOT tagged "Custom".',
                },
                output: {
                  expected:
                    'The response lists MITRE-tagged rules excluding any with a "Custom" tag. The results include "Suspicious PowerShell Execution", "PowerShell Encoded Command", "Credential Access via LSASS", "Process Injection T1055", "PowerShell Network Scan", "Lateral Movement via SMB", and "Phishing URL Indicators". None of the MITRE-tagged rules carry the "Custom" tag.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.discover_rule_tags', 'security.find_rules'],
                },
              },
              {
                input: {
                  question: 'List my top 3 enabled rules sorted by severity (most severe first).',
                },
                output: {
                  expected:
                    'The response lists the top 3 enabled rules sorted by severity descending. The results include "Suspicious PowerShell Execution" (critical, risk 99), "Credential Access via LSASS" (critical, risk 95), and "Process Injection T1055" (critical, risk 95).',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me my disabled detection rules.',
                },
                output: {
                  expected:
                    'The response lists disabled detection rules. The results include "Lateral Movement via SMB" (high, risk 70, eql) and "Phishing URL Indicators" (low, risk 25, threat_match).',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'List detection rules tagged with "NonExistentTag".',
                },
                output: {
                  expected:
                    'No detection rules match the tag "NonExistentTag". The tag was not found among available tags. The response suggests using tag discovery to explore available values.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.discover_rule_tags'],
                },
              },
              {
                input: {
                  question:
                    'Which 10 detection rules generated the most alerts in the last 24 hours?',
                },
                output: {
                  expected:
                    'The response ranks rules by alert volume. "Suspicious PowerShell Execution" has 30 alerts and "Brute Force Detection" has 20 alerts. Alerts were aggregated by kibana.alert.rule.uuid then translated to rule names via the find-rules tool.',
                },
                metadata: {
                  query_intent: 'Noisy Rules',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.alerts', 'security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me my noisiest detection rules this week.',
                },
                output: {
                  expected:
                    'The response ranks rules by alert volume. "Suspicious PowerShell Execution" is the noisiest with 30 alerts, followed by "Brute Force Detection" with 20 alerts. Alerts were aggregated by kibana.alert.rule.uuid then translated to rule names via the find-rules tool.',
                },
                metadata: {
                  query_intent: 'Noisy Rules',
                  expectedSkill: 'find-rules',
                  tool_sequence: ['security.alerts', 'security.find_rules'],
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
                  expected:
                    'I will investigate alert abc123 by looking at the alert details, related events, and timeline activity to help triage it.',
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
                  expected:
                    'I will search for lateral movement indicators using ES|QL queries across endpoint and Windows event logs, looking for suspicious logon types over the last 7 days.',
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
                  expected:
                    'I will look up the risk score for host srv-01 and check its recent changes using the entity analytics data.',
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
                  expected: 'I will check the ML jobs for anomalies detected in the last 24 hours.',
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
                  expected: 'I will disable the detection rule "Suspicious PowerShell Execution".',
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
                  expected:
                    'I will look up alerting V2 rules (not Security detection rules) that use ES|QL queries to monitor system CPU.',
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
      'second-turn query for a disjoint severity forces a new tool call',
      async ({ chatClient }) => {
        const turn1 = await chatClient.converse({
          messages: [
            {
              message: 'List all critical severity detection rules.',
            },
          ],
        });

        expect(turn1.errors).toEqual([]);
        expect(turn1.conversationId).toBeDefined();

        const turn2 = await chatClient.converse({
          messages: [
            {
              message:
                'I also need a list of all my medium severity detection rules. Can you query the rule inventory for those?',
            },
          ],
          conversationId: turn1.conversationId,
        });

        expect(turn2.errors).toEqual([]);

        const turn2ToolCalls = (turn2.steps ?? []).filter(
          (step: { type?: string; tool_id?: string }) =>
            step.type === 'tool_call' && step.tool_id === 'security.find_rules'
        );
        expect(turn2ToolCalls.length).toBeGreaterThan(0);

        const turn2CallArgs = turn2ToolCalls.map((step: { params?: unknown }) =>
          JSON.stringify(step.params ?? {})
        );
        const hasMediumFilter = turn2CallArgs.some((args: string) => args.includes('"medium"'));
        expect(hasMediumFilter).toBe(true);

        const lastMessage = turn2.messages[turn2.messages.length - 1]?.message ?? '';
        const mediumRuleNames = [
          'Brute Force Detection',
          'Anomalous DNS Activity',
          'PowerShell Network Scan',
        ];
        const mentionedMedium = mediumRuleNames.some((n) => lastMessage.includes(n));
        expect(mentionedMedium).toBe(true);
      }
    );
  }
);
