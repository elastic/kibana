/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginSetup } from '@kbn/agent-builder-plugin/server';
import { ALERTING_V2_UPDATE_RULE_TOOL_ID } from './update_rule_tool';
import { ALERTING_V2_DELETE_RULES_TOOL_ID } from './delete_rules_tool';
import { ALERTING_V2_CREATE_RULE_TOOL_ID } from './create_rule_tool';
import { ALERTING_V2_UPDATE_FINDING_STATUS_TOOL_ID } from './update_finding_status_tool';

export const RULE_SUGGESTION_ATTACHMENT_TYPE = 'rule_doctor_suggestion';

const FINDING_TYPE_LABELS: Record<string, string> = {
  deduplication: 'Deduplication',
  threshold_tuning: 'Threshold Tuning',
  stale_rule: 'Stale Rule',
  coverage_gap: 'Coverage Gap',
};

const relatedRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  schedule: z.string(),
  enabled: z.boolean(),
  action: z.enum(['retain', 'delete']),
});

const ruleSuggestionDataSchema = z.object({
  findingId: z.string().describe('Rule Doctor finding ID for status updates'),
  findingType: z
    .enum(['deduplication', 'threshold_tuning', 'stale_rule', 'coverage_gap'])
    .describe('The type of suggestion'),
  action: z
    .string()
    .describe('Recommended action (merge, tune, delete, disable, re_enable_and_tune, create)'),
  impact: z.enum(['low', 'medium', 'high']).describe('Estimated impact of the suggestion'),
  confidence: z
    .enum(['low', 'medium', 'high'])
    .describe('Confidence level of the suggestion'),
  summary: z.string().describe('One-line summary of the suggestion'),
  explanation: z.string().describe('Detailed rationale for the suggestion'),
  proposed: z.string().describe('JSON-serialised proposed rule configuration'),
  diffs: z.string().describe('JSON-serialised array of field diffs'),
  ruleName: z.string().describe('Human-readable rule name'),
  relatedRules: z
    .string()
    .optional()
    .describe('JSON-serialised array of related rules with retain/delete actions'),
});

type RuleSuggestionData = z.infer<typeof ruleSuggestionDataSchema>;

export const registerRuleSuggestionAttachmentType = (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.attachments.registerType({
    id: RULE_SUGGESTION_ATTACHMENT_TYPE,
    validate: (input: unknown) => {
      const result = ruleSuggestionDataSchema.safeParse(input);
      if (result.success) {
        return { valid: true as const, data: result.data };
      }
      return { valid: false as const, error: result.error.message };
    },
    format: (attachment: Attachment<string, RuleSuggestionData>) => {
      const {
        findingId,
        findingType,
        action,
        impact,
        summary,
        explanation,
        proposed,
        diffs,
        ruleName,
        relatedRules: relatedRulesJson,
      } = attachment.data;

      const typeLabel = FINDING_TYPE_LABELS[findingType] ?? findingType;

      let diffsBlock = '';
      try {
        const parsed = JSON.parse(diffs) as Array<{
          field: string;
          previous: unknown;
          proposed: unknown;
        }>;
        if (parsed.length > 0) {
          diffsBlock =
            '\n\nChanged fields:\n' +
            parsed
              .map(
                (d) =>
                  `- **${d.field}**: \`${JSON.stringify(d.previous)}\` → \`${JSON.stringify(d.proposed)}\``
              )
              .join('\n');
        }
      } catch {
        // ignore parse errors
      }

      let relatedRulesBlock = '';
      if (relatedRulesJson) {
        try {
          const rules = relatedRuleSchema.array().parse(JSON.parse(relatedRulesJson));
          if (rules.length > 0) {
            relatedRulesBlock =
              '\n\nRelated rules:\n' +
              '| Action | Name | Kind | Schedule | Enabled | ID |\n' +
              '|--------|------|------|----------|---------|----|\n' +
              rules
                .map(
                  (r) =>
                    `| ${r.action.toUpperCase()} | ${r.name} | ${r.kind} | ${r.schedule} | ${r.enabled ? 'Yes' : 'No'} | ${r.id} |`
                )
                .join('\n') +
              '\n\nRules marked DELETE should be removed after the retained rule is updated.';
          }
        } catch {
          // ignore parse errors
        }
      }

      return {
        getRepresentation: () => ({
          type: 'text' as const,
          value:
            `**Rule Doctor Suggestion** — ${typeLabel}\n` +
            `**Summary:** ${summary}\n` +
            `**Action:** ${action} | **Impact:** ${impact}\n` +
            `**Finding ID:** ${findingId}\n\n` +
            `**Rationale:** ${explanation}\n\n` +
            `**Proposed configuration for "${ruleName}":**\n\n` +
            `\`\`\`json\n${proposed}\n\`\`\`` +
            diffsBlock +
            relatedRulesBlock,
        }),
      };
    },
    getTools: () => [
      ALERTING_V2_UPDATE_RULE_TOOL_ID,
      ALERTING_V2_DELETE_RULES_TOOL_ID,
      ALERTING_V2_CREATE_RULE_TOOL_ID,
      ALERTING_V2_UPDATE_FINDING_STATUS_TOOL_ID,
    ],
    getAgentDescription: () =>
      `You have a Rule Doctor suggestion attachment. The attachment data contains full context about an AI-generated recommendation for improving alerting rules.

ATTACHMENT DATA FIELDS:
- "findingId": the unique finding ID — use this with ${ALERTING_V2_UPDATE_FINDING_STATUS_TOOL_ID} to mark as "applied" after changes
- "findingType": one of "deduplication", "threshold_tuning", "stale_rule", or "coverage_gap"
- "action": the recommended action (e.g. merge, tune, delete, disable, re_enable_and_tune, create)
- "impact": estimated impact level (low, medium, high)
- "confidence": confidence level (low, medium, high)
- "summary": one-line summary of the suggestion
- "explanation": detailed rationale
- "proposed": a JSON-serialised v2 alerting rule configuration
- "diffs": a JSON-serialised array of field-level changes (field, previous, proposed)
- "ruleName": the human-readable rule name
- "relatedRules" (optional): a JSON-serialised array of related rules with retain/delete actions and their IDs

GENERAL WORKFLOW:
1. When the user asks to refine or adjust the proposed configuration, use the attachment_update tool to update the attachment data. Parse the current "proposed" JSON, apply the requested changes, then write back the updated JSON string. Also update "diffs" to reflect the new changes.
2. Always show the user what changed before applying updates.
3. After successfully applying changes, use ${ALERTING_V2_UPDATE_FINDING_STATUS_TOOL_ID} with the "findingId" from the attachment data to mark the finding as "applied".

FINDING-TYPE-SPECIFIC WORKFLOWS:

**Deduplication** (relatedRules has retain/delete actions):
- Use ${ALERTING_V2_UPDATE_RULE_TOOL_ID} with the rule ID marked "retain" and the proposed configuration as the update payload.
- Then use ${ALERTING_V2_DELETE_RULES_TOOL_ID} with the IDs of all rules marked "delete".

**Threshold Tuning** (single rule, proposed has updated thresholds/schedule):
- Use ${ALERTING_V2_UPDATE_RULE_TOOL_ID} with the rule ID and the proposed configuration.

**Stale Rule** (single rule, action may be delete, disable, or re-enable):
- If the recommendation is to delete: use ${ALERTING_V2_DELETE_RULES_TOOL_ID} with the rule ID.
- If the recommendation is to disable: use ${ALERTING_V2_UPDATE_RULE_TOOL_ID} with enabled=false.
- If the recommendation is to re-enable and tune: use ${ALERTING_V2_UPDATE_RULE_TOOL_ID} with enabled=true and the proposed configuration.

**Coverage Gap** (no existing rule, proposed is a new rule):
- Use ${ALERTING_V2_CREATE_RULE_TOOL_ID} with the proposed configuration to create the new rule.`,
  } as Parameters<typeof agentBuilder.attachments.registerType>[0]);
};
