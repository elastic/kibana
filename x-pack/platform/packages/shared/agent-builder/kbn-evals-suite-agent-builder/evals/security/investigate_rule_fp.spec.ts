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
  'Security Skills - Investigate Rule (Known FP by Analyst Disposition)',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'rules with analyst FP dispositions are fast-pathed to a remediation recommendation',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-investigate-rule-fp-disposition',
            description:
              'Validates that the skill surfaces kibana.alert.workflow_reason as the primary ' +
              'FP signal when analysts have already closed alerts as false_positive or benign_positive, ' +
              'and routes to a remediation recommendation without requiring entity analysis.',
            examples: [
              {
                // Analyst dispositions referenced explicitly: the skill should call
                // security.alerts, read workflow_reasons, and fast-path to a remediation suggestion.
                input: {
                  question:
                    'Most of the recent alerts from rule d4b14cb2-3c4e-4d7a-8b02-d3a1e5f9c7e1 ' +
                    'have been closed as false positives by our analysts. What is driving the ' +
                    'noise and how do I fix it?',
                },
                output: {
                  expected:
                    'I will fetch recent alerts for this rule and check the workflow_reason ' +
                    'dispositions. Since many alerts have been closed as false_positive, I will ' +
                    'treat this as confirmed FP evidence and recommend adding an exception for ' +
                    'the top contributing entities.',
                },
                metadata: {
                  query_intent: 'Known FP by analyst disposition',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
              {
                // "Benign positive" is a distinct standard reason alongside "false_positive".
                // Both should be treated as analyst-confirmed FP signals.
                input: {
                  question:
                    'Analysts have been marking alerts from the "Linux Sudo Privilege Escalation" ' +
                    'rule as benign positive for weeks. Can you analyze the pattern and suggest ' +
                    'a tuning action?',
                },
                output: {
                  expected:
                    'I will retrieve the alert data for this rule and examine the workflow_reason ' +
                    'distribution. benign_positive dispositions are a strong signal that this rule ' +
                    'is generating noise from expected activity; I will identify the top entities ' +
                    'and recommend an exception or suppression in the Detection Rules UI.',
                },
                metadata: {
                  query_intent: 'Known FP by benign_positive disposition',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
              {
                // Mixed signals: some FP closures but also open alerts. The skill should
                // treat the dispositions as supporting evidence and combine with entity
                // analysis, rather than fast-pathing directly to a recommendation.
                input: {
                  question:
                    'Some alerts from rule 7f3a2b1c-4d5e-6f7a-8b9c-0d1e2f3a4b5c have been ' +
                    'closed as false positives but most are still open. Is there enough evidence ' +
                    'to tune the rule?',
                },
                output: {
                  expected:
                    'I will fetch recent alerts and check both the workflow_reason distribution ' +
                    'and the top entity breakdown. Partial FP dispositions are supporting evidence ' +
                    'but I will also examine which entities drive the open alerts before making ' +
                    'a recommendation.',
                },
                metadata: {
                  query_intent: 'Mixed FP signal: dispositions + open alerts',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
              {
                // Implicit disposition signal: the user says "keep closing" without
                // using the technical term. The skill should still route correctly and
                // call security.alerts to verify the workflow_reason data.
                input: {
                  question:
                    'Every time this rule fires for host "admin-workstation-42" I close it ' +
                    'as a false positive. Is there a way to stop the rule from generating ' +
                    'these alerts in the first place?',
                },
                output: {
                  expected:
                    'I will load the alert data for this rule to confirm that the alerts for ' +
                    'admin-workstation-42 carry a false_positive workflow_reason, then recommend ' +
                    'adding a host-level exception in the Detection Rules UI to prevent future alerts from ' +
                    'that host.',
                },
                metadata: {
                  query_intent: 'Implicit FP disposition from repeated manual closure',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
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
              'and call security.alerts to surface top contributing entities.',
            examples: [
              {
                // Typical first-turn FP report — rule referenced by UUID, no prior attachment.
                // Expect: resolve_rule_attachment (to load the rule) then security.alerts.
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
                // and call security.alerts once the attachment is in context.
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
                  expectedToolId: 'security.alerts',
                },
              },
              {
                // Entity-concentrated FP pattern explicitly described — the skill should
                // use security.alerts to confirm the entity concentration and classify
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
                    'is generating a disproportionate share of alerts. Since the user has indicated ' +
                    'this is expected CI automation, I will recommend adding an exception (or alert ' +
                    'suppression) for that host in the Detection Rules UI.',
                },
                metadata: {
                  query_intent: 'FP Investigation — entity concentration',
                  expectedSkill: 'investigate-rule',
                  expectedToolId: 'security.alerts',
                },
              },
              {
                // Explicit ask for top entities — maps directly to the top_entities
                // aggregation returned by security.alerts.
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
                  expectedToolId: 'security.alerts',
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
                  expectedToolId: 'security.alerts',
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
              {
                // Plural list/rank request — belongs to find-security-rules, not the
                // single-rule investigate-rule skill. Guards the scoping boundary that
                // investigate-rule only handles ONE explicitly-identified rule.
                input: {
                  question:
                    'Which of my detection rules are the noisiest right now? ' +
                    'Give me the top 5 by alert volume.',
                },
                output: {
                  expected:
                    'This is a plural list/rank request across many rules, so it belongs to ' +
                    'find-security-rules, not the single-rule investigate-rule skill.',
                },
                metadata: {
                  query_intent: 'Plural list/rank — belongs to find-security-rules',
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
