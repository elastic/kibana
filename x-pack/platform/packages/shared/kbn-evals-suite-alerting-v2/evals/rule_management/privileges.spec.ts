/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  ALERTING_TOOL_IDS,
  RULE_MANAGEMENT_SKILL_ID,
} from '../../src/constants';

evaluate.describe(
  'Alerting V2 rule-management skill - privilege enforcement',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'unprivileged user cannot compose rules',
      async ({ unprivilegedEvaluateDataset }) => {
        await unprivilegedEvaluateDataset({
          dataset: {
            name: 'alerting-v2: privilege enforcement',
            description:
              'Verifies that a read-only user (alerting_v2_rules: read, no write) is refused ' +
              'when asking the agent to compose or modify a rule. The agent should surface the ' +
              'missing privilege (Rules: All) rather than composing the rule.',
            examples: [
              {
                input: {
                  turns: [
                    'Create an alert rule that fires when average CPU is above 90%.',
                  ],
                },
                output: {
                  criteria: [
                    'The assistant does NOT successfully compose a rule attachment — it refuses or reports a privilege error.',
                    'The response mentions the missing privilege "Rules: All" (or equivalent wording indicating the user lacks write/manage access to rules).',
                    'The assistant does NOT render a rule attachment with a "Create rule" button.',
                    'The assistant suggests the user ask an administrator for the required privilege or mentions that discovery (read-only) is still available.',
                  ],
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  expectedToolIds: [ALERTING_TOOL_IDS.manageRule],
                },
              },
            ],
          },
        });
      }
    );
  }
);
