/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULE_ATTACHMENT_TYPE, type RuleAttachmentData } from '@kbn/alerting-v2-schemas';
import { expect } from '@playwright/test';
import { tags } from '@kbn/scout';
import { evaluate } from '../../src/evaluate';
import {
  ALERTING_TOOL_IDS,
  DETECTION_RULE_EDIT_SKILL_ID,
  RULE_AUTHORING_SKILL_ID,
} from '../../src/constants';
import { getLatestAttachmentData } from '../../src/evaluators/expected_attachment';
import { HOST_METRICS_CPU_FIELD } from '../../src/full_stack_data';

evaluate.describe(
  'Alerting V2 rule-authoring skill - rule templates',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'starts a rule from the matching template',
      async ({ evaluateDataset, hostMetricsIndex, ruleTemplates }) => {
        void hostMetricsIndex; // Seeds the host metrics the template reads.
        const { hostCpu } = ruleTemplates;
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule templates - single match',
            description:
              'The user asks for the recommended CPU alert for their fake_hosts hosts. Exactly one ' +
              'seeded template matches and its data exists, so the agent should find it, start the ' +
              'rule with apply_template, and say which template it used.',
            examples: [
              {
                input: {
                  turns: [
                    'Set up the recommended CPU alert for my fake_hosts hosts using a prebuilt template.',
                  ],
                },
                output: {
                  criteria: [
                    `The assistant looks up rule templates with ${ALERTING_TOOL_IDS.findRuleTemplates} before composing the rule.`,
                    `The assistant starts the rule from the "${hostCpu.attributes.rule.metadata.name}" template with an apply_template operation rather than composing the query by hand.`,
                    'The assistant tells the user which template the rule was started from.',
                    'The assistant does not claim the rule has been saved, and directs the user to the Create rule button.',
                  ],
                  expectedSkills: [RULE_AUTHORING_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
                  expectedToolIds: [
                    ALERTING_TOOL_IDS.findRuleTemplates,
                    ALERTING_TOOL_IDS.manageRule,
                  ],
                  expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
                  expectAttachmentData: (attachments) => {
                    const rule = getLatestAttachmentData<RuleAttachmentData>(
                      attachments,
                      RULE_ATTACHMENT_TYPE
                    );
                    expect(rule?.template_id).toBe(hostCpu.id);
                    expect(rule?.query?.base).toContain(HOST_METRICS_CPU_FIELD);
                  },
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'asks the user to choose when several templates match',
      async ({ evaluateDataset, hostMetricsIndex, ruleTemplates }) => {
        void hostMetricsIndex; // Seeds the host metrics the templates read.
        const { hostCpu, hostMemory } = ruleTemplates;
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule templates - ambiguous match',
            description:
              'The user asks for a recommended host alert without saying which signal. Two seeded ' +
              'templates (CPU and memory) match, so the agent should list them and ask which one to ' +
              'use instead of applying one on its own.',
            examples: [
              {
                input: {
                  turns: ['What prebuilt alerts can I set up for my fake_hosts hosts?'],
                },
                output: {
                  criteria: [
                    `The assistant looks up rule templates with ${ALERTING_TOOL_IDS.findRuleTemplates}.`,
                    `The assistant presents both the "${hostCpu.attributes.rule.metadata.name}" and "${hostMemory.attributes.rule.metadata.name}" templates in plain language.`,
                    'The assistant asks the user which template to use and does not apply a template or compose a rule before the user chooses.',
                  ],
                  expectedSkills: [RULE_AUTHORING_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
                  expectedToolIds: [ALERTING_TOOL_IDS.findRuleTemplates],
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'composes a fully specified rule without looking up templates',
      async ({ evaluateDataset, hostMetricsIndex, ruleTemplates }) => {
        void ruleTemplates; // Templates exist, but the request does not need them.
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule templates - full specification',
            description:
              'The user gives the index, condition, threshold, and grouping. A matching template ' +
              'exists, but the agent should compose the rule directly from the specification.',
            examples: [
              {
                input: {
                  turns: [
                    `Create an alert rule on ${hostMetricsIndex} that fires when average ` +
                      `${HOST_METRICS_CPU_FIELD} is above 0.75, grouped by host.name, checked every 2 minutes.`,
                  ],
                },
                output: {
                  criteria: [
                    `The assistant does not call ${ALERTING_TOOL_IDS.findRuleTemplates} and does not use apply_template; it composes the rule directly from the specification.`,
                    'The rule fires when average CPU is above 0.75, grouped by host.name, running every 2 minutes.',
                  ],
                  expectedSkills: [RULE_AUTHORING_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
                  expectedToolIds: [ALERTING_TOOL_IDS.manageRule],
                  expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
                  expectAttachmentData: (attachments) => {
                    const rule = getLatestAttachmentData<RuleAttachmentData>(
                      attachments,
                      RULE_ATTACHMENT_TYPE
                    );
                    expect(rule?.template_id).toBeUndefined();
                    expect(rule?.schedule?.every).toBe('2m');
                  },
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'reports missing integration data instead of repointing the template',
      async ({ evaluateDataset, ruleTemplates }) => {
        const { nginxErrors } = ruleTemplates;
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule templates - missing data',
            description:
              'The nginx template matches the request, but no nginx data is indexed. The agent ' +
              'should tell the user the integration data is missing rather than pointing the ' +
              'template query at another index.',
            examples: [
              {
                input: {
                  turns: ['Use the prebuilt template to alert me on nginx 5xx errors.'],
                },
                output: {
                  criteria: [
                    `The assistant looks up rule templates with ${ALERTING_TOOL_IDS.findRuleTemplates} and identifies the "${nginxErrors.attributes.rule.metadata.name}" template.`,
                    'The assistant tells the user that no nginx data was found and that the nginx integration may need to be installed or sending data.',
                    'The assistant does not rewrite the template query to read from an unrelated index, and does not claim a working rule was created.',
                  ],
                  expectedSkills: [RULE_AUTHORING_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
                  expectedToolIds: [ALERTING_TOOL_IDS.findRuleTemplates],
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'customizes a template threshold and keeps the template attribution',
      async ({ evaluateDataset, hostMetricsIndex, ruleTemplates }) => {
        void hostMetricsIndex; // Seeds the host metrics the template reads.
        const { hostCpu } = ruleTemplates;
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule templates - customization',
            description:
              'The user starts from the CPU template but changes its threshold. The agent should ' +
              'apply the template and then change the breach condition, keeping the template ' +
              'attribution on the rule.',
            examples: [
              {
                input: {
                  turns: [
                    'Use the prebuilt host CPU template for my fake_hosts hosts, but fire at 80% CPU instead of 90%.',
                  ],
                },
                output: {
                  criteria: [
                    `The assistant starts the rule from the "${hostCpu.attributes.rule.metadata.name}" template with apply_template.`,
                    'The final rule fires when CPU is above 0.8 instead of the template default of 0.9.',
                    'The final manage_rule call ends with a validate operation, and validation succeeds.',
                  ],
                  expectedSkills: [RULE_AUTHORING_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
                  expectedToolIds: [
                    ALERTING_TOOL_IDS.findRuleTemplates,
                    ALERTING_TOOL_IDS.manageRule,
                  ],
                  expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
                  expectAttachmentData: (attachments) => {
                    const rule = getLatestAttachmentData<RuleAttachmentData>(
                      attachments,
                      RULE_ATTACHMENT_TYPE
                    );
                    expect(rule?.template_id).toBe(hostCpu.id);
                    const condition = `${rule?.query?.base ?? ''} ${
                      rule?.query?.breach?.segment ?? ''
                    }`;
                    expect(condition).toMatch(/0\.8\b/);
                    expect(condition).not.toMatch(/0\.9\b/);
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
