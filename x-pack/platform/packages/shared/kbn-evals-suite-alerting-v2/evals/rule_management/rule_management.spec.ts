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
import { evaluate } from '../../src/evaluate';
import {
  ALERTING_TOOL_IDS,
  CREATE_WITH_AGENT_INITIAL_PROMPT,
  DETECTION_RULE_EDIT_SKILL_ID,
  INDEX_DISCOVERY_TOOL_IDS,
  INDEX_MAPPING_TOOL_ID,
  RULE_MANAGEMENT_SKILL_ID,
} from '../../src/constants';
import { getLatestAttachmentData } from '../../src/evaluators/expected_attachment';

evaluate.describe(
  'Alerting V2 rule-management skill - routing',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate('skill routing', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'alerting-v2: skill routing',
          description:
            'Verifies that Observability / ops alerting requests route to the rule-management ' +
            'skill and Security / SIEM detection requests route to detection-rule-edit.',
          examples: [
            {
              input: {
                turns: [
                  'Alert me when average CPU usage on my hosts stays above 90% for 5 minutes.',
                ],
              },
              output: {
                criteria: [
                  'The assistant treats this as an Observability / ops alerting request (e.g. host CPU threshold) rather than a Security/SIEM detection-rule request.',
                  'The response progresses toward an Alerting V2 alert rule (clarifying details or composing) and does not create or propose a Security detection rule.',
                ],
                expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
              },
            },
            {
              input: {
                turns: [
                  'Create a detection rule to detect brute-force login attempts against my hosts.',
                ],
              },
              output: {
                criteria: [
                  'The assistant treats this as a Security/SIEM detection-rule request (brute-force login attempts) rather than an Alerting V2 / Observability alert-rule request.',
                  'The response progresses toward a Security detection rule and does not compose an Alerting V2 rule via manage_rule.',
                ],
                expectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
                notExpectedSkills: [RULE_MANAGEMENT_SKILL_ID],
              },
            },
          ],
        },
      });
    });
  }
);

evaluate.describe(
  'Alerting V2 rule-management skill - composition',
  { tag: tags.serverless.observability.complete },
  () => {
    evaluate(
      'rule composition',
      async ({ evaluateDataset, hostMetricsIndex, adminConsoleIndex }) => {
        await evaluateDataset({
          dataset: {
            name: 'alerting-v2: rule composition',
            description:
              'Exercises rule composition via the Alerting V2 rule-management skill across ' +
              'multiple scenarios: the "Create with AI Agent" UI entry point, a fully-specified ' +
              'single-turn request, and a vague natural-language request that requires index ' +
              'discovery. All target data-forge-seeded indices so ES|QL validation is real.',
            examples: [
              {
                input: {
                  turns: [
                    CREATE_WITH_AGENT_INITIAL_PROMPT,
                    `Average system.cpu.total.norm.pct on ${hostMetricsIndex} — create an alert rule that fires when it ` +
                      'stays above 0.9 for 5 minutes, grouped by host.name. Check every 1 minute.',
                  ],
                },
                output: {
                  criteria: [
                    'The first-turn response is a guided setup question about what to monitor (data source, condition, or both) — not a composed rule and not a refusal.',
                    "The second-turn response uses the user's answer to compose the rule rather than re-asking for details the user already provided.",
                    'The breach ES|QL query filters for average system.cpu.total.norm.pct above 0.9 (or an equivalent 90% threshold expression), and the 5-minute duration is expressed via lookback/schedule or a state transition — not a WHERE on @timestamp.',
                    'The set_query operation validates successfully against Elasticsearch, and the final manage_rule call ends with a validate operation.',
                    'The assistant directs the user to the Create rule button / attachment actions instead of claiming the rule was persisted via API.',
                  ],
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
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
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
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
              {
                input: {
                  turns: [
                    `Create alert rule on ${hostMetricsIndex} with severity critical that fires when average ` +
                      'system.cpu.total.norm.pct exceeds 0.95, grouped by host.name.',
                  ],
                },
                output: {
                  criteria: [
                    'The breach ES|QL query includes a `severity` column (e.g. via EVAL severity = "critical") to set the alert severity.',
                    'The query filters for average system.cpu.total.norm.pct above 0.95 (or an equivalent threshold expression).',
                    'The set_query operation validates successfully against Elasticsearch, and the final manage_rule call ends with a validate operation.',
                    'The assistant directs the user to the Create rule button / attachment actions instead of claiming the rule was persisted via API.',
                  ],
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
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
                    const esql = attachment!.query ? getBreachEsqlQuery(attachment!.query) : '';
                    expect(esql).toContain(hostMetricsIndex);
                    expect(esql).toContain('system.cpu.total.norm.pct');
                    expect(esql.toLowerCase()).toContain('severity');
                    expect(esql.toLowerCase()).toContain('critical');
                  },
                },
              },
              {
                input: {
                  turns: [
                    'Create an alert rule on my admin console data that fires when there are ' +
                      'more than 3 errors in the last 5 minutes.',
                  ],
                },
                output: {
                  criteria: [
                    `The rule's ES|QL query targets ${adminConsoleIndex} (or an equivalent admin-console source), counts error events (e.g. filtering on log.level == "ERROR" or an equivalent error indicator present in the mappings), and fires when the count is greater than 3.`,
                    'The query does not embed an absolute @timestamp time-range filter for the 5-minute window — lookback expresses the duration.',
                    'The set_query operation validates successfully against Elasticsearch, and the final manage_rule call ends with a validate operation.',
                    'The assistant directs the user to the Create rule button / attachment actions instead of claiming the rule was persisted via API.',
                  ],
                  expectedSkills: [RULE_MANAGEMENT_SKILL_ID],
                  notExpectedSkills: [DETECTION_RULE_EDIT_SKILL_ID],
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
