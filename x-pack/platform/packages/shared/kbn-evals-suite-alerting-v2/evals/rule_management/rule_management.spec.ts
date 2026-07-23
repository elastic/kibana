/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBreachEsqlQuery,
  RULE_ATTACHMENT_TYPE,
  type RuleAttachmentData,
} from '@kbn/alerting-v2-schemas';
import { expect } from '@playwright/test';
import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import {
  ALERTING_TOOL_IDS,
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  DETECTION_RULE_EDIT_SKILL_ID,
  INDEX_DISCOVERY_TOOL_IDS,
  INDEX_MAPPING_TOOL_ID,
  RULE_MANAGEMENT_SKILL_ID,
} from '../../src/constants';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';
import { getLatestAttachmentData } from '../../src/evaluators/expected_attachment';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, log }, use) => {
      use(createEvaluateDataset({ chatClient, evaluators, executorClient, log }));
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'Alerting V2 rule-management skill - routing',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('vague alerting openers route to rule-management', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'alerting-v2: rule-management soft openers',
          description:
            'Vague "help me get started with alerting" prompts should activate the rule-management ' +
            'skill (not Security detection-rule-edit) and clarify whether the user wants Alerting V2 ' +
            'or Security detection rules before orienting them or composing a rule.',
          examples: [
            {
              input: {
                turns: ["I want to set up alerting but I'm not sure where to start."],
              },
              output: {
                criteria: [
                  'On this vague opener, the assistant tries to establish whether the user wants operational/observability alerting (Alerting V2) or Security detection rules before proceeding — via a structured question (e.g. an ask_user_question prompt) or in prose — rather than assuming one or composing a rule. Equivalent labels such as "Observability" or "Operations" for the Alerting V2 side count as valid disambiguation.',
                  'The response does not create a Security detection rule or a finished Alerting V2 rule in this turn.',
                ],
              },
              metadata: {
                query_intent: 'Soft opener — set up alerting',
                expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                shouldNotActivateSkill: DETECTION_RULE_EDIT_SKILL_ID,
              },
            },
          ],
        },
      });
    });

    evaluate(
      'multi-turn: clarifying the opener stays in rule-management',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule-management multi-turn clarification',
            description:
              'A vague opener followed by the user clarifying they mean Alerting V2 (not Security) ' +
              'should keep the rule-management skill engaged across turns, retain context, and ' +
              'progress toward composing an Alerting V2 alert rule.',
            examples: [
              {
                input: {
                  turns: [
                    "I want to set up alerting but I'm not sure where to start.",
                    'I mean Elastic Alerting V2, not Security detection rules. I want to know when ' +
                      'CPU usage on my hosts stays above 90%.',
                  ],
                },
                output: {
                  criteria: [
                    'On the first (vague) turn, the assistant tries to establish whether the user wants operational/observability alerting (Alerting V2) or Security detection rules — via a structured question (e.g. an ask_user_question prompt) or in prose — rather than assuming. Equivalent labels such as "Observability" or "Operations" for the Alerting V2 side count as valid disambiguation.',
                    "After the user clarifies Alerting V2 and CPU above 90%, the assistant progresses toward composing an Alerting V2 alert rule rather than repeating the same generic orientation or switching to Security detection rules.",
                    'The assistant retains context from earlier turns (does not re-ask what the user already answered) and does not contradict itself.',
                  ],
                },
                metadata: {
                  query_intent: 'Multi-turn clarification — opener then V2 CPU rule',
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  shouldNotActivateSkill: DETECTION_RULE_EDIT_SKILL_ID,
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'multi-turn: confirming Security routes to detection-rule-edit',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule-management multi-turn security handoff',
            description:
              'A vague opener where the user then confirms they actually want Security detection ' +
              'rules should hand off to the Security detection-rule-edit skill rather than forcing ' +
              'the request into Alerting V2 or claiming the agent cannot help.',
            examples: [
              {
                input: {
                  turns: [
                    "I want to set up alerting but I'm not sure where to start.",
                    'Actually I mean Security detection rules — I want to detect brute-force login ' +
                      'attempts against my hosts.',
                  ],
                },
                output: {
                  criteria: [
                    'On the first (vague) turn, the assistant tries to establish whether the user wants operational/observability alerting (Alerting V2) or Security detection rules — via a structured question (e.g. an ask_user_question prompt) or in prose — rather than assuming. Equivalent labels such as "Observability" or "Operations" for the Alerting V2 side count as valid disambiguation.',
                    'Once the user confirms they want Security detection rules (brute-force login attempts), the assistant routes to Security detection-rule functionality rather than continuing to steer them toward Alerting V2 or claiming it cannot help.',
                    'The assistant retains context from earlier turns and uses the clarification to progress toward a Security detection rule.',
                  ],
                },
                metadata: {
                  query_intent: 'Multi-turn confirmation — opener then Security detection rule',
                  // The rule-management skill legitimately loads on turn 1, so we do not
                  // forbid it here. The signal under test is that the Security
                  // detection-rule-edit skill is activated once the user confirms Security.
                  expectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
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
  'Alerting V2 rule-management skill - Create with AI Agent entry point',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'UI entry prompt loads the skill, asks what to monitor, then composes',
      async ({ evaluateDataset, hostMetricsIndex }) => {
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: create-with-agent UI entry point',
            description:
              'Exercises the exact initial message the rules list page sends when the user clicks ' +
              '"Create with AI Agent". The prompt explicitly names the rule-management skill and ' +
              'alerting v2, so no V2-vs-Security disambiguation is needed: the agent should load ' +
              'the skill, ask what the user wants to monitor (guided setup), and after the user ' +
              'answers, compose the rule via manage_rule.',
            examples: [
              {
                input: {
                  turns: [
                    CREATE_WITH_AGENT_INITIAL_PROMPT,
                    `Average system.cpu.total.norm.pct on ${hostMetricsIndex} — alert me when it ` +
                      'stays above 0.9 for 5 minutes, grouped by host.name.',
                  ],
                },
                output: {
                  criteria: [
                    'The first-turn response is a guided setup question about what to monitor (data source, condition, or both) — not a composed rule, not a V2-vs-Security disambiguation, and not a refusal.',
                    "The second-turn response uses the user's answer to compose the rule rather than re-asking for details the user already provided.",
                    'The breach ES|QL query filters for average system.cpu.total.norm.pct above 0.9 (or an equivalent 90% threshold expression), and the 5-minute duration is expressed via lookback/schedule or a state transition — not a WHERE on @timestamp.',
                    'The set_query operation validates successfully against Elasticsearch, and the final manage_rule call ends with a validate operation.',
                    'The assistant directs the user to the Create rule button / attachment actions instead of claiming the rule was persisted via API.',
                  ],
                },
                metadata: {
                  query_intent: 'UI entry point — Create with AI Agent guided setup then compose',
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  shouldNotActivateSkill: DETECTION_RULE_EDIT_SKILL_ID,
                  expectedToolIds: [ALERTING_TOOL_IDS.manageRule],
                  expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
                  expectAttachmentData: (attachments) => {
                    const attachment = getLatestAttachmentData<RuleAttachmentData>(
                      attachments,
                      RULE_ATTACHMENT_TYPE
                    );
                    expect(attachment).toBeDefined();
                    expect(attachment!.kind).toEqual('alert');
                    expect(attachment!.grouping?.fields).toEqual(
                      expect.arrayContaining(['host.name'])
                    );
                    expect(
                      attachment!.state_transition?.pending_timeframe ??
                        attachment!.schedule?.lookback
                    ).toEqual('5m');
                    const esql = attachment!.query ? getBreachEsqlQuery(attachment!.query) : '';
                    expect(esql).toContain(hostMetricsIndex);
                    expect(esql).toContain('system.cpu.total.norm.pct');
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

evaluate.describe(
  'Alerting V2 rule-management skill - composition',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'fully-specified request composes a CPU alert rule',
      async ({ evaluateDataset, hostMetricsIndex }) => {
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule-management fully-specified compose',
            description:
              'A single-turn request that already supplies every detail needed to build a rule ' +
              '(index pattern, metric field, threshold, grouping, and duration) should route to the ' +
              'Alerting V2 rule-management skill and compose the rule via manage_rule in this turn — ' +
              'no further clarification is required. The target index is seeded via data-forge so the ' +
              "skill's set_query ES|QL validation resolves against a real, mapped source.",
            examples: [
              {
                input: {
                  turns: [
                    `Create an alert rule on ${hostMetricsIndex} that fires when average ` +
                      'system.cpu.total.norm.pct stays above 0.9 for 5 minutes, grouped by host.name.',
                  ],
                },
                output: {
                  criteria: [
                    'Composes in this turn rather than asking for details the user already gave (index, metric, threshold, grouping, and duration).',
                    'The breach ES|QL query filters for average system.cpu.total.norm.pct above 0.9 (or an equivalent 90% threshold expression).',
                    'The query does not embed an absolute time-range or @timestamp window filter for the 5-minute duration — the lookback/schedule (or a state transition) expresses the duration, not a WHERE on @timestamp.',
                    'The set_query operation validates successfully against Elasticsearch (the index and fields exist), and the final manage_rule call ends with a validate operation.',
                    'The assistant directs the user to the Create rule button / attachment actions instead of claiming the rule was persisted via API.',
                  ],
                },
                metadata: {
                  query_intent:
                    'Fully-specified compose — CPU alert rule with index, threshold, grouping, duration',
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  shouldNotActivateSkill: DETECTION_RULE_EDIT_SKILL_ID,
                  expectedToolIds: [ALERTING_TOOL_IDS.manageRule],
                  expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
                  expectAttachmentData: (attachments) => {
                    const attachment = getLatestAttachmentData<RuleAttachmentData>(
                      attachments,
                      RULE_ATTACHMENT_TYPE
                    );
                    expect(attachment).toBeDefined();
                    expect(attachment!.kind).toEqual('alert');
                    expect(attachment!.grouping?.fields).toEqual(
                      expect.arrayContaining(['host.name'])
                    );
                    // "stays above for 5 minutes" → pending timeframe / lookback, not a
                    // WHERE on @timestamp. Accept either representation.
                    expect(
                      attachment!.state_transition?.pending_timeframe ??
                        attachment!.schedule?.lookback
                    ).toEqual('5m');
                    const esql = attachment!.query ? getBreachEsqlQuery(attachment!.query) : '';
                    expect(esql).toContain(hostMetricsIndex);
                    expect(esql).toContain('system.cpu.total.norm.pct');
                  },
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'vague admin-console request discovers index then composes',
      async ({ evaluateDataset, adminConsoleIndex }) => {
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule-management vague admin-console compose',
            description:
              'A natural-language request that names a dataset colloquially ("admin console") and ' +
              'gives a threshold/window, but not the concrete index pattern or field names. Asking ' +
              'Alerting V2 vs Security first is allowed; once the user confirms Alerting V2, the ' +
              'agent should discover the admin-console index, inspect mappings, and compose via ' +
              'manage_rule. The target index is seeded via data-forge.',
            examples: [
              {
                input: {
                  // May be a multi turn request if the agent asks which alerting system to use.
                  turns: [
                    'Create an alert rule on my admin console data that fires when there are ' +
                      'more than 3 errors in the last 5 minutes.',
                    'Alerting V2 — not Security detection rules.',
                  ],
                },
                output: {
                  criteria: [
                    'If the assistant asks which alerting system to use on the first turn, that is acceptable — it must not assume Security detection rules. After the user confirms Alerting V2, it proceeds to compose rather than repeating the same disambiguation.',
                    `The rule's ES|QL query targets ${adminConsoleIndex} (or an equivalent admin-console source), counts error events (e.g. filtering on log.level == "ERROR" or an equivalent error indicator present in the mappings), and fires when the count is greater than 3.`,
                    'The query does not embed an absolute @timestamp time-range filter for the 5-minute window — lookback expresses the duration.',
                    'The set_query operation validates successfully against Elasticsearch, and the final manage_rule call ends with a validate operation.',
                    'The assistant directs the user to the Create rule button / attachment actions instead of claiming the rule was persisted via API.',
                  ],
                },
                metadata: {
                  query_intent:
                    'Vague compose — admin console errors > 3 in 5m (clarify V2 ok, then discover + compose)',
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  shouldNotActivateSkill: DETECTION_RULE_EDIT_SKILL_ID,
                  // Index is only named colloquially, so after clarification the agent must
                  // discover it and inspect mappings before composing.
                  expectedToolIds: [ALERTING_TOOL_IDS.manageRule, INDEX_MAPPING_TOOL_ID],
                  expectedAnyOfToolIds: INDEX_DISCOVERY_TOOL_IDS,
                  expectRenderAttachment: [RULE_ATTACHMENT_TYPE],
                  expectAttachmentData: (attachments) => {
                    const attachment = getLatestAttachmentData<RuleAttachmentData>(
                      attachments,
                      RULE_ATTACHMENT_TYPE
                    );
                    expect(attachment).toBeDefined();
                    expect(attachment!.kind).toEqual('alert');
                    expect(attachment!.schedule?.lookback).toEqual('5m');
                    const esql = attachment!.query ? getBreachEsqlQuery(attachment!.query) : '';
                    expect(esql.toLowerCase()).toContain('admin-console');
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
