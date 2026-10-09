/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ACTION_POLICY_ATTACHMENT_TYPE,
  RULE_ATTACHMENT_TYPE,
  type ActionPolicyAttachmentData,
  type RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { expect } from '@playwright/test';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  ACTION_POLICY_MANAGEMENT_SKILL_ID,
  ALERTING_TOOL_IDS,
  DETECTION_RULE_EDIT_SKILL_ID,
  RULE_MANAGEMENT_SKILL_ID,
  WORKFLOW_AUTHORING_SKILL_ID,
  WORKFLOW_GENERATION_TOOL_ID,
  WORKFLOW_YAML_ATTACHMENT_TYPE,
} from '../../src/constants';
import { assertActionPolicyWorkflowLiquid } from '../../src/assert_action_policy_workflow_liquid';
import { getLatestAttachmentData } from '../../src/evaluators/expected_attachment';

evaluate.describe(
  'Alerting V2 rule-management skill - action policies (notifications)',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'offers notifications after compose, then sets up an action policy',
      async ({ evaluateDataset, hostMetricsIndex, emailConnectorId }) => {
        void emailConnectorId; // Seeds the `.email` connector default notification setup requires.
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule-management notification setup',
            description:
              'Exercises the cross-skill notification setup flow. Turn 1 is a fully-specified ' +
              'composed rule creation request on the seeded host-metrics index; after composing the complete ' +
              'alert rule the agent should proactively offer to set up email notifications. ' +
              'Turn 2 accepts: the agent should load the action-policy-management skill (and ' +
              'workflow-authoring), generate a notification workflow (an email connector is ' +
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
                  criteria: [
                    'The first-turn response composes the rule AND proactively asks whether the user wants to set up (email) notifications for it — proactive means the assistant raises notifications itself; merely complying after the user brings it up on turn 2 does not satisfy this.',
                    'After the user accepts notifications, the assistant loads the action-policy-management skill to own workflow + action policy setup (rather than composing those from the rule-management skill alone).',
                    'The assistant does not claim that no email connector is configured — one exists in the environment and should be discovered (e.g. via platform.workflows.get_connectors).',
                    'The action policy uses per_alert grouping and on_status_change throttle.',
                    'The final manage_action_policy call ends with a validate operation, and validation succeeds (after corrective retries if needed).',
                    'The assistant never claims the rule, workflow, or action policy has been saved or activated (describing them as prepared drafts is fine) — it directs the user to save them via the attachment action buttons, with the workflow saved before the action policy.',
                    'The assistant does not require the rule to be saved before the action policy, but reminds the user that the rule is still unsaved and that the policy will not match any alerts until the rule carrying its routing tag is saved.',
                  ],
                  expectedSkills: [
                    RULE_MANAGEMENT_SKILL_ID,
                    ACTION_POLICY_MANAGEMENT_SKILL_ID,
                    WORKFLOW_AUTHORING_SKILL_ID,
                  ],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
                  // The full notification flow also composes the rule and generates the
                  // notification workflow before the policy is wired up.
                  expectedToolIds: [
                    ALERTING_TOOL_IDS.manageActionPolicy,
                    ALERTING_TOOL_IDS.manageRule,
                    WORKFLOW_GENERATION_TOOL_ID,
                  ],
                  expectRenderAttachment: [
                    RULE_ATTACHMENT_TYPE,
                    WORKFLOW_YAML_ATTACHMENT_TYPE,
                    ACTION_POLICY_ATTACHMENT_TYPE,
                  ],
                  expectAttachmentData: (attachments) => {
                    const rule = getLatestAttachmentData<RuleAttachmentData>(
                      attachments,
                      RULE_ATTACHMENT_TYPE
                    );
                    const workflow = getLatestAttachmentData<{
                      workflowId?: string;
                      yaml?: string;
                    }>(attachments, WORKFLOW_YAML_ATTACHMENT_TYPE);
                    const actionPolicy = getLatestAttachmentData<ActionPolicyAttachmentData>(
                      attachments,
                      ACTION_POLICY_ATTACHMENT_TYPE
                    );

                    const ruleId = rule?.id;
                    const workflowId = workflow?.workflowId;

                    expect(ruleId).toEqual(expect.any(String));
                    expect(workflowId).toEqual(expect.any(String));
                    expect(workflow?.yaml).toEqual(expect.any(String));
                    expect(actionPolicy).toBeDefined();
                    // The policy is linked to the rule only through a shared routing tag.
                    const routingTags = rule?.metadata?.routing_tags ?? [];
                    const matcherTags = actionPolicy!.matcher?.tags ?? [];
                    expect(matcherTags.length).toBeGreaterThan(0);
                    expect(routingTags).toEqual(expect.arrayContaining(matcherTags));
                    expect(actionPolicy!.destinations).toEqual([
                      { type: 'workflow', id: workflowId },
                    ]);

                    const { workflow: parsedWorkflow } = assertActionPolicyWorkflowLiquid(
                      workflow?.yaml
                    );
                    expect(parsedWorkflow.triggers.map((trigger) => trigger.type)).toEqual([
                      'manual',
                    ]);
                  },
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'creates a catch-all policy without requiring the unsaved rule to be saved',
      async ({ evaluateDataset, hostMetricsIndex, emailConnectorId }) => {
        void emailConnectorId; // Seeds the `.email` connector default notification setup requires.
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: action policy catch-all with unsaved rule',
            description:
              'Turn 1 composes a rule that is never saved. Turn 2 ' +
              'asks for a catch-all notification policy that is not tied to that rule. The agent ' +
              'must compose the policy without a matcher, must not link it to the unsaved rule, and ' +
              'must not make saving the rule a precondition for the policy.',
            examples: [
              {
                input: {
                  turns: [
                    `Create an alert rule on ${hostMetricsIndex} that fires when average ` +
                      'system.cpu.total.norm.pct stays above 0.9 for 5 minutes, grouped by host.name.',
                    'Do not set up notifications for that rule specifically. Instead, create a catch-all ' +
                      'notification policy that emails oncall@example.com for every alert in the space.',
                  ],
                },
                output: {
                  criteria: [
                    'The action policy is a catch-all: it has no matcher tags and no matcher expression, so it is not scoped to the rule from turn 1.',
                    'The assistant does not add a routing tag to the rule and does not link the policy to it.',
                    'The assistant does not require the unsaved rule to be saved before the action policy can be created; it does not block or delay the policy on the rule.',
                    'The assistant never claims the workflow or action policy has been saved or activated (describing them as prepared drafts is fine), and directs the user to save the workflow before the action policy.',
                    'The final manage_action_policy call ends with a validate operation, and validation succeeds (after corrective retries if needed).',
                  ],
                  expectedSkills: [
                    RULE_MANAGEMENT_SKILL_ID,
                    ACTION_POLICY_MANAGEMENT_SKILL_ID,
                    WORKFLOW_AUTHORING_SKILL_ID,
                  ],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
                  expectedToolIds: [
                    ALERTING_TOOL_IDS.manageActionPolicy,
                    ALERTING_TOOL_IDS.manageRule,
                    WORKFLOW_GENERATION_TOOL_ID,
                  ],
                  expectRenderAttachment: [
                    RULE_ATTACHMENT_TYPE,
                    WORKFLOW_YAML_ATTACHMENT_TYPE,
                    ACTION_POLICY_ATTACHMENT_TYPE,
                  ],
                  expectAttachmentData: (attachments) => {
                    const rule = getLatestAttachmentData<RuleAttachmentData>(
                      attachments,
                      RULE_ATTACHMENT_TYPE
                    );
                    const workflow = getLatestAttachmentData<{ workflowId?: string }>(
                      attachments,
                      WORKFLOW_YAML_ATTACHMENT_TYPE
                    );
                    const actionPolicy = getLatestAttachmentData<ActionPolicyAttachmentData>(
                      attachments,
                      ACTION_POLICY_ATTACHMENT_TYPE
                    );

                    expect(actionPolicy).toBeDefined();
                    expect(actionPolicy!.matcher?.tags ?? []).toEqual([]);
                    expect(actionPolicy!.matcher?.expression ?? null).toBeNull();
                    expect(actionPolicy!.destinations).toEqual([
                      { type: 'workflow', id: workflow?.workflowId },
                    ]);
                    expect(rule?.metadata?.routing_tags ?? []).toEqual([]);
                  },
                },
              },
            ],
          },
        });
      }
    );
  }
);
