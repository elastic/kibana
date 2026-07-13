/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Grounded-output evals for the alert-triage skill.
 *
 * Unlike routing.spec.ts (skill/tool selection only), these seed deterministic alert data,
 * invoke the triage skill, and verify the highest-priority alert ID appears in the response.
 *
 * Evaluators: RequiredAlertIdsInResponse, RequiredTermsInResponse, ExpectedSkillInvocation,
 * ToolUsageOnly, Factuality, Groundedness.
 *
 * Seeding runs in beforeAll / afterAll via alert_triage_fixtures.ts. If the alerts index is
 * unavailable, CODE evaluators skip gracefully (empty required arrays → score 1).
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';
import { seedPriorityAlerts, type SeededPriorityAlertIds } from './alert_triage_fixtures';

evaluate.describe(
  'Alert Triage - grounded output',
  { tag: [...tags.serverless.security.complete] },
  () => {
    let seededAlertIds: SeededPriorityAlertIds | undefined;
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ esClient, log }) => {
      const seeded = await seedPriorityAlerts({ esClient, log });
      seededAlertIds = seeded?.fixtures;
      teardown = seeded?.cleanup;
    });

    evaluate.afterAll(async () => {
      await teardown?.();
    });

    evaluate('response cites the highest-priority alert ID', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: security-alert-triage-grounded-output',
          description:
            'Validates that the alert-triage skill response references the highest-priority seeded ' +
            'alert ID. The critical Lateral Movement alert (risk_score=99, MITRE boost=+30) should ' +
            'rank first and its _id must appear in the final response.',
          examples: [
            {
              input: {
                question: 'What should I focus on right now? Show me the current alert queue.',
              },
              output: {
                expected:
                  'The highest-priority group is on host EVAL-DC01 driven by a critical-severity ' +
                  'Lateral Movement alert (Remote Service Creation via Named Pipe) with a risk score ' +
                  'of 99 and a +30 MITRE tactic boost. The top alert ID for that group is ' +
                  `${seededAlertIds?.critical ?? '<seeded-id>'}. ` +
                  'A second group on EVAL-WORKSTATION-01 involves Credential Access (LSASS Memory), ' +
                  'scoring 95. A lower-priority Discovery alert on EVAL-SCANNER-01 rounds out the queue. ' +
                  'Presentation order of groups and details does not affect correctness.',
              },
              metadata: {
                query_intent: 'Alert Queue Triage - Grounded Output',
                expectedSkill: 'alert-triage',
                expectedOnlyToolId: 'security.alert-triage',
                requiredAlertIds: seededAlertIds ? [seededAlertIds.critical] : [],
                requiredTerms: seededAlertIds ? ['99'] : [],
              },
            },
          ],
        },
      });
    });

    evaluate(
      'response cites the top two group alert IDs when asked for detail',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-alert-triage-grounded-output-top2',
            description:
              'Validates that the triage response references the IDs for both the critical and high ' +
              'priority seeded alerts when the user asks for a prioritized list with details.',
            examples: [
              {
                input: {
                  question:
                    'Prioritize the alert queue for the last 24 hours and list the top alert IDs I should investigate.',
                },
                output: {
                  expected:
                    'The two highest-priority alerts are: ' +
                    `(1) ${
                      seededAlertIds?.critical ?? '<critical-id>'
                    } — Lateral Movement on EVAL-DC01, ` +
                    `risk score 99 with a +30 MITRE boost (score 129); ` +
                    `(2) ${
                      seededAlertIds?.high ?? '<high-id>'
                    } — Credential Access on EVAL-WORKSTATION-01, ` +
                    `risk score 75 with a +20 MITRE boost (score 95). ` +
                    'Both should be investigated further with alert-analysis. ' +
                    'Presentation order of the two alerts does not affect correctness.',
                },
                metadata: {
                  query_intent: 'Alert Queue Triage - Grounded Output with IDs',
                  expectedSkill: 'alert-triage',
                  expectedOnlyToolId: 'security.alert-triage',
                  requiredAlertIds: seededAlertIds
                    ? [seededAlertIds.critical, seededAlertIds.high]
                    : [],
                  requiredTerms: seededAlertIds ? ['99', '75'] : [],
                },
              },
            ],
          },
        });
      }
    );
  }
);
