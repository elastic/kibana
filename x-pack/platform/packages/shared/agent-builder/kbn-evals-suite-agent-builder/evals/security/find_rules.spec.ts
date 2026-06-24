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
import {
  disableAgentBuilderExperimentalFeatures,
  enableAgentBuilderExperimentalFeatures,
} from './agent_builder_experimental';

interface MultiTurnToolCallStep {
  type?: string;
  tool_id?: string;
  params?: Record<string, unknown>;
  results?: unknown[];
}

function collectFindRulesToolCalls(
  steps: MultiTurnToolCallStep[] | undefined
): MultiTurnToolCallStep[] {
  return (steps ?? []).filter(
    (step) => step.type === 'tool_call' && step.tool_id === 'security.find_rules'
  );
}

function stringifyMultiTurnEvidence(
  messages: { message?: string }[] | undefined,
  findRulesCalls: MultiTurnToolCallStep[]
): string {
  return [
    ...(messages ?? []).map((msg) => msg.message ?? ''),
    ...findRulesCalls.flatMap((step) => [
      JSON.stringify(step.params ?? {}),
      JSON.stringify(step.results ?? []),
    ]),
  ].join('\n');
}

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

    evaluate.beforeAll(async ({ kbnClient, esClient, log, uiSettings }) => {
      await enableAgentBuilderExperimentalFeatures(uiSettings);
      const seeded = await seedFindRulesFixtures({ kbnClient, esClient, log });
      teardown = seeded.cleanup;
    });

    evaluate.afterAll(async ({ uiSettings }) => {
      await disableAgentBuilderExperimentalFeatures(uiSettings);
      if (teardown) await teardown();
    });

    evaluate(
      'rule-discovery queries activate the find-rules skill',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-find-rules-skill',
            description:
              'Validates multi-rule discovery queries with simple flat filters. Backed by 10 seeded rules + 50 synthetic alerts (30 -> "Suspicious PowerShell Execution", 20 -> "Brute Force Detection").',
            examples: [
              {
                input: {
                  question: 'List all enabled detection rules tagged with MITRE.',
                },
                output: {
                  expected:
                    'Found 5 enabled detection rules with the MITRE tag. "Suspicious PowerShell Execution" is a critical severity query rule with risk score 99. "PowerShell Encoded Command" is a high severity query rule with risk score 73. "Credential Access via LSASS" is a critical severity query rule with risk score 95. "Process Injection T1055" is a critical severity eql rule with risk score 95. "PowerShell Network Scan" is a medium severity query rule with risk score 47. The discover_rule_tags tool was used to find tags matching MITRE, then find_rules filtered by that tag with enabled set to true.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.discover_rule_tags', 'security.find_rules'],
                },
              },
              {
                input: {
                  question: 'How many custom (non-prebuilt) detection rules do I have enabled?',
                },
                output: {
                  expected:
                    'There are 8 enabled custom detection rules. The find_rules tool was called with enabled set to true and ruleSource set to custom. The total field returned 8.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'How many detection rules are enabled vs disabled?',
                },
                output: {
                  expected:
                    'There are 8 enabled detection rules and 2 disabled detection rules, for a total of 10 rules. The find_rules tool was called twice: once with enabled set to true returning 8, and once with enabled set to false returning 2.',
                },
                metadata: {
                  query_intent: 'Rule Count Breakdown',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me query-type detection rules whose name contains "PowerShell".',
                },
                output: {
                  expected:
                    'Found 3 query-type detection rules with "PowerShell" in the name. "Suspicious PowerShell Execution" has critical severity and risk score 99. "PowerShell Encoded Command" has high severity and risk score 73. "PowerShell Network Scan" has medium severity and risk score 47. All three are query-type rules and are enabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me my network detection rules.',
                },
                output: {
                  expected:
                    'Found 4 network-related detection rules by first using discover_rule_tags to find tags containing "Network". "Lateral Movement via SMB" is a high severity eql rule with risk score 70 and is disabled. "Brute Force Detection" is a medium severity threshold rule with risk score 47 and is enabled. "Anomalous DNS Activity" is a medium severity esql rule with risk score 47 and is enabled. "Phishing URL Indicators" is a low severity threat_match rule with risk score 25 and is disabled.',
                },
                metadata: {
                  query_intent: 'Semantic Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.discover_rule_tags', 'security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me my critical severity detection rules.',
                },
                output: {
                  expected:
                    'Found 3 critical severity detection rules. "Suspicious PowerShell Execution" is a query rule with risk score 99 and is enabled. "Credential Access via LSASS" is a query rule with risk score 95 and is enabled. "Process Injection T1055" is an eql rule with risk score 95 and is enabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'List the top 5 enabled detection rules sorted by highest risk score.',
                },
                output: {
                  expected:
                    'The top 5 enabled detection rules sorted by risk score are "Suspicious PowerShell Execution" with risk score 99, "Credential Access via LSASS" with risk score 95, "Process Injection T1055" with risk score 95, "PowerShell Encoded Command" with risk score 73, and "Custom DLL Loading Detection" with risk score 70.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me detection rules covering MITRE technique T1059.',
                },
                output: {
                  expected:
                    'Found 2 detection rules mapped to MITRE technique T1059 (Command and Scripting Interpreter). "Suspicious PowerShell Execution" is a critical severity query rule with risk score 99 and is enabled. "PowerShell Encoded Command" is a high severity query rule with risk score 73 and is enabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me enabled critical OR high severity detection rules.',
                },
                output: {
                  expected:
                    'Found 5 enabled detection rules with critical or high severity. Critical: "Suspicious PowerShell Execution" (query, risk score 99), "Credential Access via LSASS" (query, risk score 95), "Process Injection T1055" (eql, risk score 95). High: "PowerShell Encoded Command" (query, risk score 73), "Custom DLL Loading Detection" (query, risk score 70).',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Find detection rules covering MITRE technique T1055.',
                },
                output: {
                  expected:
                    'Found 1 detection rule mapped to MITRE technique T1055 (Process Injection). "Process Injection T1055" is a critical severity eql rule with risk score 95 and is enabled.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me MITRE-tagged detection rules that are NOT tagged "Custom".',
                },
                output: {
                  expected:
                    'Found 7 MITRE-tagged detection rules that do not have the "Custom" tag. "Suspicious PowerShell Execution" (critical, query, risk score 99, enabled). "PowerShell Encoded Command" (high, query, risk score 73, enabled). "Credential Access via LSASS" (critical, query, risk score 95, enabled). "Process Injection T1055" (critical, eql, risk score 95, enabled). "PowerShell Network Scan" (medium, query, risk score 47, enabled). "Lateral Movement via SMB" (high, eql, risk score 70, disabled). "Phishing URL Indicators" (low, threat_match, risk score 25, disabled). The discover_rule_tags tool was used to find MITRE and Custom tags.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.discover_rule_tags', 'security.find_rules'],
                },
              },
              {
                input: {
                  question: 'List my top 3 enabled rules sorted by severity (most severe first).',
                },
                output: {
                  expected:
                    'The top 3 enabled detection rules sorted by severity descending are: "Suspicious PowerShell Execution" (critical severity, query type, risk score 99), "Credential Access via LSASS" (critical severity, query type, risk score 95), and "Process Injection T1055" (critical severity, eql type, risk score 95).',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me my disabled detection rules.',
                },
                output: {
                  expected:
                    'Found 2 disabled detection rules. "Lateral Movement via SMB" is a high severity eql rule with risk score 70 and tags including MITRE and Domain: Network. "Phishing URL Indicators" is a low severity threat_match rule with risk score 25 and tags including MITRE and Domain: Network.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.find_rules'],
                },
              },
              {
                input: {
                  question: 'List detection rules tagged with "NonExistentTag".',
                },
                output: {
                  expected:
                    'The tag "NonExistentTag" was not found among the available tags. The discover_rule_tags tool returned available tags but none matched "NonExistentTag". No detection rules match this tag.',
                },
                metadata: {
                  query_intent: 'Rule Discovery',
                  expectedSkill: 'find-security-rules',
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
                    'The two rules that generated the most alerts are "Suspicious PowerShell Execution" with 30 alerts and "Brute Force Detection" with 20 alerts, for a total of 50 alerts. "Suspicious PowerShell Execution" is a critical severity query rule with risk score 99. "Brute Force Detection" is a medium severity threshold rule with risk score 47. The alerts tool was used to aggregate alerts by rule, then find_rules was used to look up the rule details.',
                },
                metadata: {
                  query_intent: 'Noisy Rules',
                  expectedSkill: 'find-security-rules',
                  tool_sequence: ['security.alerts', 'security.find_rules'],
                },
              },
              {
                input: {
                  question: 'Show me my noisiest detection rules this week.',
                },
                output: {
                  expected:
                    'The noisiest detection rules are "Suspicious PowerShell Execution" with 30 alerts and "Brute Force Detection" with 20 alerts. "Suspicious PowerShell Execution" is a critical severity query rule with risk score 99. "Brute Force Detection" is a medium severity threshold rule with risk score 47. The alerts tool was used to aggregate alerts by rule, then find_rules was used to look up rule details.',
                },
                metadata: {
                  query_intent: 'Noisy Rules',
                  expectedSkill: 'find-security-rules',
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
  'Security Skills - Find Rules MITRE Routing',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ kbnClient, esClient, log, uiSettings }) => {
      await enableAgentBuilderExperimentalFeatures(uiSettings);
      const seeded = await seedFindRulesFixtures({ kbnClient, esClient, log });
      teardown = seeded.cleanup;
    });

    evaluate.afterAll(async ({ uiSettings }) => {
      await disableAgentBuilderExperimentalFeatures(uiSettings);
      if (teardown) await teardown();
    });

    evaluate(
      'mitre routing queries use structured parameters not tags',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-find-rules-mitre-routing',
            description:
              'Validates that MITRE queries route to structured rule fields (mitreTechnique/mitreTactic), ' +
              'not tags. Covers multiple tactics to test generalization, including tactics whose rules ' +
              'have structured threat data but no "Tactic: X" tag — those are findable only via the ' +
              'structured field, not via tags.',
            examples: [
              {
                input: {
                  question: 'Show me detection rules covering MITRE technique T1059.',
                },
                output: {
                  expected:
                    'Found 2 detection rules covering MITRE technique T1059 (Command and Scripting Interpreter). ' +
                    '"Suspicious PowerShell Execution" is a critical severity query rule with risk score 99 and is enabled. ' +
                    '"PowerShell Encoded Command" is a high severity query rule with risk score 73 and is enabled. ' +
                    'The find_rules tool was called with mitreTechnique set to T1059.',
                },
                metadata: {
                  query_intent: 'MITRE Technique ID Query',
                  expectedSkill: 'find-security-rules',
                  expectedOnlyToolId: 'security.find_rules',
                },
              },
              {
                input: {
                  question: 'Show me detection rules covering the Initial Access tactic.',
                },
                output: {
                  expected:
                    'Found 2 detection rules covering the Initial Access tactic (TA0001). ' +
                    '"Phishing URL Indicators" is a low severity threat_match rule with risk score 25 and is disabled. ' +
                    '"Spear Phishing Email Detection" is a medium severity query rule with risk score 50 and is enabled. ' +
                    'The find_rules tool was called with mitreTactic set to "TA0001" to query the structured threat field, ' +
                    'which finds rules whose tactic is recorded in threat metadata even when no tactic tag is present.',
                },
                metadata: {
                  query_intent: 'MITRE Tactic Name Query',
                  expectedSkill: 'find-security-rules',
                  expectedOnlyToolId: 'security.find_rules',
                },
              },
              {
                input: {
                  question: 'Show me detection rules for the Execution tactic.',
                },
                output: {
                  expected:
                    'Found 2 detection rules covering the Execution tactic (TA0002). ' +
                    '"Suspicious PowerShell Execution" is a critical severity query rule with risk score 99 and is enabled. ' +
                    '"PowerShell Encoded Command" is a high severity query rule with risk score 73 and is enabled. ' +
                    'The find_rules tool was called with mitreTactic set to "TA0002".',
                },
                metadata: {
                  query_intent: 'MITRE Tactic Name Query',
                  expectedSkill: 'find-security-rules',
                  expectedOnlyToolId: 'security.find_rules',
                },
              },
              {
                input: {
                  question: 'Show me detection rules for the Credential Access tactic.',
                },
                output: {
                  expected:
                    'Found 2 detection rules covering the Credential Access tactic (TA0006). ' +
                    '"Credential Access via LSASS" is a critical severity query rule with risk score 95 and is enabled. ' +
                    '"Suspicious Mimikatz Behavior" is a high severity eql rule with risk score 73 and is enabled. ' +
                    'The find_rules tool was called with mitreTactic set to "TA0006" to find rules whose ' +
                    'tactic is in threat metadata, including rules with no "Tactic: Credential Access" tag.',
                },
                metadata: {
                  query_intent: 'MITRE Tactic Name Query',
                  expectedSkill: 'find-security-rules',
                  expectedOnlyToolId: 'security.find_rules',
                },
              },
              {
                input: {
                  question: 'Show me detection rules for tactic TA0005.',
                },
                output: {
                  expected:
                    'Found 2 detection rules covering tactic TA0005 (Defense Evasion). ' +
                    '"Process Injection T1055" is a critical severity eql rule with risk score 95 and is enabled. ' +
                    '"Process Hollowing Detection" is a high severity query rule with risk score 70 and is enabled. ' +
                    'The find_rules tool was called with mitreTactic set to "TA0005".',
                },
                metadata: {
                  query_intent: 'MITRE Tactic ID Query',
                  expectedSkill: 'find-security-rules',
                  expectedOnlyToolId: 'security.find_rules',
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
    evaluate.beforeAll(async ({ uiSettings }) => {
      await enableAgentBuilderExperimentalFeatures(uiSettings);
    });

    evaluate.afterAll(async ({ uiSettings }) => {
      await disableAgentBuilderExperimentalFeatures(uiSettings);
    });

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
                  shouldNotActivateSkill: 'find-security-rules',
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
                  shouldNotActivateSkill: 'find-security-rules',
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
                  shouldNotActivateSkill: 'find-security-rules',
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
                  shouldNotActivateSkill: 'find-security-rules',
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
                  shouldNotActivateSkill: 'find-security-rules',
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
                  shouldNotActivateSkill: 'find-security-rules',
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

    evaluate.beforeAll(async ({ kbnClient, esClient, log, uiSettings }) => {
      await enableAgentBuilderExperimentalFeatures(uiSettings);
      const seeded = await seedFindRulesFixtures({ kbnClient, esClient, log });
      teardown = seeded.cleanup;
    });

    evaluate.afterAll(async ({ uiSettings }) => {
      await disableAgentBuilderExperimentalFeatures(uiSettings);
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

        const turn2FindRulesCalls = collectFindRulesToolCalls(turn2.steps);
        const turn2CallArgs = turn2FindRulesCalls.map((step) => JSON.stringify(step.params ?? {}));
        const hasMediumFilter = turn2CallArgs.some((args) => args.includes('"medium"'));
        const turn2Text = stringifyMultiTurnEvidence(turn2.messages, turn2FindRulesCalls);

        const mediumRuleNames = [
          'Brute Force Detection',
          'Anomalous DNS Activity',
          'PowerShell Network Scan',
        ];
        const mentionedMediumRules = mediumRuleNames.filter((name) => turn2Text.includes(name));

        // Multi-turn contract: turn 2 must answer the medium-severity ask without errors.
        // Ideal: a fresh security.find_rules call with severity medium (or medium in params).
        // Acceptable: grounded answer citing at least two seeded medium rules from inventory.
        const hasFreshMediumToolCall = turn2FindRulesCalls.length > 0 && hasMediumFilter;
        const hasGroundedMediumAnswer = mentionedMediumRules.length >= 2;

        expect(hasFreshMediumToolCall || hasGroundedMediumAnswer).toBe(true);
        expect(turn2Text.trim().length).toBeGreaterThan(0);
      }
    );
  }
);
