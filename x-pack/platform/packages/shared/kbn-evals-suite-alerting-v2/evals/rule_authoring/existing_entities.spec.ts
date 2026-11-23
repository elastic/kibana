/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools } from '@kbn/agent-builder-common/tools';
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
  ACTION_POLICY_AUTHORING_SKILL_ID,
  ALERTING_TOOL_IDS,
  RULE_AUTHORING_SKILL_ID,
} from '../../src/constants';
import { getLatestAttachmentData } from '../../src/evaluators/expected_attachment';

/*
 * These evals run on the `evals_alerting_v2` config set, which keeps
 * `agentBuilder:experimentalFeatures` off, so the agent cannot rely on SML tools
 * to find saved rules and policies.
 */
evaluate.describe(
  'Alerting V2 skills - existing rules and action policies',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('finds and edits an existing rule', async ({ evaluateDataset, existingRule }) => {
      await evaluateDataset({
        dataset: {
          name: 'alerting-v2: edit an existing rule',
          description:
            'A saved rule exists. The agent must discover it by name with the Kibana API tools, ' +
            'attach it with attach_rule, and modify it through manage_rule on the attachment.',
          examples: [
            {
              input: {
                turns: [
                  `Find my alerting rule named "${existingRule.name}" and change its schedule to run every 10 minutes.`,
                ],
              },
              output: {
                criteria: [
                  'The assistant finds the saved rule by name using the Kibana API tools (describe_api / execute_api), not by guessing or asking the user for its id.',
                  'The assistant attaches the saved rule and edits that attachment with manage_rule, rather than composing a new rule from scratch.',
                  'The final manage_rule call ends with a validate operation, and validation succeeds.',
                  'The assistant directs the user to the Update rule button / attachment actions instead of claiming the change was persisted via API.',
                ],
                expectedSkills: [RULE_AUTHORING_SKILL_ID],
                expectedToolIds: [
                  internalTools.describeApi,
                  internalTools.executeApi,
                  ALERTING_TOOL_IDS.attachRule,
                  ALERTING_TOOL_IDS.manageRule,
                ],
                expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
                expectAttachmentData: (attachments) => {
                  const rule = getLatestAttachmentData<RuleAttachmentData>(
                    attachments,
                    RULE_ATTACHMENT_TYPE
                  );
                  expect(rule?.id).toBe(existingRule.id);
                  expect(rule?.schedule?.every).toBe('10m');
                },
              },
            },
          ],
        },
      });
    });

    evaluate(
      'finds and edits an existing action policy',
      async ({ evaluateDataset, existingActionPolicy }) => {
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: edit an existing action policy',
            description:
              'A saved action policy exists. The agent must discover it with find_action_policies, ' +
              'attach it with attach_action_policy, and modify it through manage_action_policy.',
            examples: [
              {
                input: {
                  turns: [
                    `Find my action policy named "${existingActionPolicy.name}" and make it match only alerts tagged "production".`,
                  ],
                },
                output: {
                  criteria: [
                    'The assistant finds the saved policy by name with find_action_policies, not by guessing or asking the user for its id.',
                    'The assistant attaches the saved policy and edits that attachment with manage_action_policy, rather than composing a new policy from scratch.',
                    'The final manage_action_policy call ends with a validate operation, and validation succeeds.',
                    'The assistant directs the user to the attachment action buttons instead of claiming the change was persisted via API.',
                  ],
                  expectedSkills: [ACTION_POLICY_AUTHORING_SKILL_ID],
                  expectedToolIds: [
                    ALERTING_TOOL_IDS.findActionPolicies,
                    ALERTING_TOOL_IDS.attachActionPolicy,
                    ALERTING_TOOL_IDS.manageActionPolicy,
                  ],
                  expectRenderAttachment: [ACTION_POLICY_ATTACHMENT_TYPE],
                  expectAttachmentData: (attachments) => {
                    const policy = getLatestAttachmentData<ActionPolicyAttachmentData>(
                      attachments,
                      ACTION_POLICY_ATTACHMENT_TYPE
                    );
                    expect(policy?.id).toBe(existingActionPolicy.id);
                    expect(policy?.name).toBe(existingActionPolicy.name);
                    expect(policy?.matcher?.tags).toEqual(['production']);
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
