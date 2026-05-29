/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

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
  'Security Skills - Investigate Rule (FP / Noise)',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'FP / noise questions activate the investigate-rule skill and fetch alerts',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-investigate-rule-fp',
            description:
              'Validates that false-positive and noise queries activate the investigate-rule skill ' +
              'and call get_rule_alerts to surface top contributing entities.',
            examples: [
              {
                // Typical first-turn FP report — rule referenced by UUID, no prior attachment.
                // Expect: resolve_rule_attachment (to load the rule) then get_rule_alerts.
                input: {
                  question:
                    'Rule d4b14cb2-3c4e-4d7a-8b02-d3a1e5f9c7e1 is generating a huge number of ' +
                    'alerts every day. Most of them look like false positives from our IT team. ' +
                    'Can you investigate?',
                },
                output: {
                  expected:
                    'I will load the rule, fetch recent alerts, and check which entities are ' +
                    'generating the most alerts to identify the false-positive pattern.',
                },
                metadata: {
                  query_intent: 'FP Investigation',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'investigate-rule.resolve_rule_attachment',
                },
              },
              {
                // Noise complaint without a UUID — should still route to investigate-rule
                // and call get_rule_alerts once the attachment is in context.
                input: {
                  question:
                    'Why is the "Unusual Process by Web Server" rule so noisy? I get hundreds ' +
                    'of alerts a day and almost all of them seem benign.',
                },
                output: {
                  expected:
                    'I will fetch recent alerts for this rule, examine the top entities ' +
                    'generating alerts, and classify the root cause — likely benign activity ' +
                    'from known web server processes or an overly broad query.',
                },
                metadata: {
                  query_intent: 'FP Investigation',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'investigate-rule.get_rule_alerts',
                },
              },
              {
                // Entity-concentrated FP pattern explicitly described — the skill should
                // use get_rule_alerts to confirm the entity concentration and classify
                // the root cause as benign activity from a known host.
                input: {
                  question:
                    'Nearly all alerts from rule 7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c are ' +
                    'coming from host "build-agent-03". That host runs automated CI jobs. ' +
                    'What should I do?',
                },
                output: {
                  expected:
                    'I will fetch the alert data for this rule and confirm that build-agent-03 ' +
                    'is generating a disproportionate share of alerts. Since this is expected ' +
                    'CI automation, I will recommend adding an exception for that host via tune-rule.',
                },
                metadata: {
                  query_intent: 'FP Investigation — entity concentration',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'investigate-rule.get_rule_alerts',
                },
              },
              {
                // Explicit ask for top entities — maps directly to the top_entities
                // aggregation returned by get_rule_alerts.
                input: {
                  question:
                    'Show me which hosts and users are generating the most alerts from ' +
                    'rule a3f7e2d1-9b4c-4e5f-8a6b-1c2d3e4f5a6b over the last 24 hours.',
                },
                output: {
                  expected:
                    'I will query recent alerts for this rule and return the top contributing ' +
                    'hosts, users, and source IPs to identify the primary false-positive sources.',
                },
                metadata: {
                  query_intent: 'FP Entity Breakdown',
                  expectedSkill: 'investigate-rule',
                  expectedOnlyToolId: 'investigate-rule.get_rule_alerts',
                },
              },
              {
                // Wider time window requested — skill should extend time_window_hours
                // rather than defaulting to 24h.
                input: {
                  question:
                    'The "Linux Sudo Privilege Escalation" rule has been noisy for the past ' +
                    'week. Can you look at the alert pattern over the last 7 days and tell me ' +
                    "what's driving it?",
                },
                output: {
                  expected:
                    'I will fetch alerts for this rule over the past 168 hours (7 days) and ' +
                    'analyse the top entities and timing patterns to determine whether the noise ' +
                    'is from a specific host, user, or time-of-day pattern.',
                },
                metadata: {
                  query_intent: 'FP Investigation — extended window',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'investigate-rule.get_rule_alerts',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'execution health and gap analysis questions do not activate the investigate-rule skill',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-investigate-rule-fp-negative',
            description:
              'Validates that execution failures and coverage-gap questions are NOT handled ' +
              'by the investigate-rule skill, which is scoped to FP / noise analysis only.',
            examples: [
              {
                // Execution health — rule failed to run. investigate-rule no longer
                // covers this branch; it should route elsewhere or remain unhandled.
                input: {
                  question:
                    'My "Windows Defender Tampering" rule shows execution errors in the log. ' +
                    'It failed to run three times in the last hour. Why?',
                },
                output: {
                  expected:
                    'I will look at the rule execution logs to identify the error class and ' +
                    'determine whether this is an index, permission, or engine-wide issue.',
                },
                metadata: {
                  query_intent: 'Execution Health',
                  shouldNotActivateSkill: 'investigate-rule',
                },
              },
              {
                // Gap analysis — rule is healthy but not firing. investigate-rule
                // no longer covers this branch.
                input: {
                  question:
                    "My 'Suspicious File Download' rule hasn't produced any alerts in 3 days " +
                    'even though I know matching events exist. Why is it quiet?',
                },
                output: {
                  expected:
                    'I will check whether the rule is executing successfully and, if so, ' +
                    'examine the query logic and index patterns to determine why no alerts ' +
                    'are being produced.',
                },
                metadata: {
                  query_intent: 'Gap Analysis',
                  shouldNotActivateSkill: 'investigate-rule',
                },
              },
            ],
          },
        });
      }
    );
  }
);
