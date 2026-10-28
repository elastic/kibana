/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { internalTools } from '@kbn/agent-builder-common/tools';
import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { expect } from '@playwright/test';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import { ALERTING_TOOL_IDS, RULE_AUTHORING_SKILL_ID } from '../../src/constants';
import { getLatestAttachmentData } from '../../src/evaluators/expected_attachment';

/*
 * These evals run on the `evals_alerting_v2` config set, which keeps
 * `agentBuilder:experimentalFeatures` off, so the agent cannot rely on SML tools
 * to find saved rules.
 */
evaluate.describe(
  'Alerting V2 skills - existing rules',
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
  }
);
