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

export const PROPOSED_CHANGE_ATTACHMENT_TYPE = 'rule_doctor_proposed_change';

const relatedRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.string(),
  schedule: z.string(),
  enabled: z.boolean(),
  action: z.enum(['retain', 'delete']),
});

const proposedChangeDataSchema = z.object({
  proposed: z.string().describe('JSON-serialised proposed rule configuration'),
  diffs: z.string().describe('JSON-serialised array of field diffs'),
  ruleName: z.string().describe('Human-readable rule name'),
  relatedRules: z
    .string()
    .optional()
    .describe('JSON-serialised array of related rules with retain/delete actions'),
});

type ProposedChangeData = z.infer<typeof proposedChangeDataSchema>;

export const registerProposedChangeAttachmentType = (agentBuilder: AgentBuilderPluginSetup) => {
  agentBuilder.attachments.registerType({
    id: PROPOSED_CHANGE_ATTACHMENT_TYPE,
    validate: (input: unknown) => {
      const result = proposedChangeDataSchema.safeParse(input);
      if (result.success) {
        return { valid: true as const, data: result.data };
      }
      return { valid: false as const, error: result.error.message };
    },
    format: (attachment: Attachment<string, ProposedChangeData>) => {
      const { proposed, diffs, ruleName, relatedRules: relatedRulesJson } = attachment.data;
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
            `Proposed rule change for "${ruleName}":\n\n` +
            `\`\`\`json\n${proposed}\n\`\`\`` +
            diffsBlock +
            relatedRulesBlock,
        }),
      };
    },
    getTools: () => [ALERTING_V2_UPDATE_RULE_TOOL_ID],
    getAgentDescription: () =>
      `You have a proposed rule change attachment. The attachment data contains:
- "proposed": a JSON-serialised v2 alerting rule configuration
- "diffs": a JSON-serialised array of field-level changes (field, previous, proposed)
- "ruleName": the human-readable rule name
- "relatedRules" (optional): a JSON-serialised array of related rules with retain/delete actions and their IDs

WORKFLOW:
1. When the user asks to refine or adjust the proposed configuration, use the attachment_update tool to update the attachment data. Parse the current "proposed" JSON, apply the requested changes, then write back the updated JSON string. Also update "diffs" to reflect the new changes.
2. When the user confirms they are satisfied and want to apply the changes, use the ${ALERTING_V2_UPDATE_RULE_TOOL_ID} tool with the rule ID from the relatedRules (the one marked "retain") and the parsed proposed configuration as the update payload.
3. Always show the user what changed before applying updates to the live rule.`,
  } as Parameters<typeof agentBuilder.attachments.registerType>[0]);
};
