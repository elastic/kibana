/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import {
  ALERTING_TOOL_IDS,
  DETECTION_RULE_EDIT_SKILL_ID,
  RULE_MANAGEMENT_SKILL_ID,
  WORKFLOW_AUTHORING_SKILL_ID,
  WORKFLOW_GENERATION_TOOL_ID,
} from '../../src/constants';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, log }, use) => {
      use(createEvaluateDataset({ chatClient, evaluators, executorClient, log }));
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Alerting V2 rule-management skill - action policies (notifications)',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'offers notifications after compose, then sets up an action policy',
      async ({ evaluateDataset, hostMetricsIndex, emailConnectorId }) => {
        void emailConnectorId; // Seeds the `.email` connector Part 3 requires.
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule-management notification setup',
            description:
              'Exercises the "Default Notification Setup" flow (Part 3 of the rule-management ' +
              'skill). Turn 1 is a fully-specified compose request on the seeded host-metrics ' +
              'index; after composing the complete alert rule the agent should proactively offer ' +
              'to set up email notifications. Turn 2 accepts: the agent should load the ' +
              'workflow-authoring skill, generate a notification workflow (an email connector is ' +
              'seeded), and compose the action policy via manage_action_policy — never claiming ' +
              'any artifact was persisted.',
            examples: [
              {
                input: {
                  turns: [
                    `Create an alert rule on ${hostMetricsIndex} that fires when average ` +
                      'system.cpu.total.norm.pct stays above 0.9 for 5 minutes, grouped by host.name.',
                    'Yes — email the team at oncall@example.com when this rule fires.',
                  ],
                },
                output: {
                  expected: [
                    'Loads the Alerting V2 rule-management skill (not Security detection-rule-edit) and composes the kind: alert rule via platform.alerting.manage_rule on the first turn.',
                    'After composing the complete alert rule, proactively offers to set up email notifications for it — the offer originates from the assistant on the first turn, before the user asks for notifications.',
                    'On the second turn, loads the workflow-authoring skill and generates a notification workflow via platform.core.generate_workflow (passing a UUID workflowId), using the configured email connector.',
                    'Calls platform.alerting.manage_action_policy to compose the action policy: workflow destination, rule.id matcher scoping it to the composed rule, per_episode grouping, on_status_change throttle, ending with a validate operation.',
                    'Renders the composed attachments inline and directs the user to save in order Rule → Workflow → Action Policy via the attachment buttons.',
                  ],
                  criteria: [
                    'The first-turn response composes the rule AND proactively asks whether the user wants to set up (email) notifications for it — proactive means the assistant raises notifications itself; merely complying after the user brings it up on turn 2 does not satisfy this.',
                    'The assistant does not claim that no email connector is configured — one exists in the environment and should be discovered (e.g. via platform.workflows.get_connectors).',
                    'The action policy destination references the workflow ID passed to generate_workflow (a UUID), not the workflow attachment id and not a connector id.',
                    'The action policy is scoped to the composed rule via a rule.id matcher (or the assistant explicitly explains a deliberately broader scope).',
                    'The final manage_action_policy call ends with a validate operation, and validation succeeds (after corrective retries if needed).',
                    'The assistant never claims the rule, workflow, or action policy has been created, saved, or activated — the tools only manage in-memory attachments, so it must direct the user to the attachment action buttons (Create rule / Save workflow / Create policy) for persistence.',
                  ],
                },
                metadata: {
                  query_intent:
                    'Notification setup — compose rule, offer notifications, then action policy on accept',
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID, WORKFLOW_AUTHORING_SKILL_ID],
                  shouldNotActivateSkill: DETECTION_RULE_EDIT_SKILL_ID,
                  expectedToolId: ALERTING_TOOL_IDS.manageActionPolicy,
                  // The full Part 3 flow also composes the rule and generates the
                  // notification workflow before the policy is wired up.
                  expectedToolGroups: [
                    [ALERTING_TOOL_IDS.manageRule],
                    [WORKFLOW_GENERATION_TOOL_ID],
                  ],
                  expectRenderAttachment: true,
                  // No assertAttachment: the rule-attachment resolver follows the latest
                  // <render_attachment> tag, which in this flow points at the action
                  // policy (or workflow) attachment rather than the rule, so a
                  // rule-shaped structural assertion would be unreliable here. Policy
                  // shape is covered by the Criteria judge instead.
                },
              },
            ],
          },
        });
      }
    );
  }
);
