/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleBuilderType } from '@kbn/alerting-v2-rule-builders';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { generateRuleSettingsUsageList } from '../../skills/schema_to_skill_docs';
import { BUILDER_RULE_DEFAULTS } from './apply_builder_params';
import { getConvertToCustomRuleToolId, getUpdateBuilderRuleToolId } from './tool_ids';

const ATTACHMENT_ONLY_NOTE = `This tool only changes the rule attachment shown in the conversation. It does NOT create or modify the underlying Alerting V2 rule (saved object); direct the user to the "Create rule" or "Update Rule" button in the rendered attachment.`;

const describeExamples = ({ examples }: RuleBuilderType): string =>
  examples
    .map(
      ({ description, params }) =>
        `- ${description}\n  \`\`\`json\n  ${JSON.stringify(params)}\n  \`\`\``
    )
    .join('\n');

export const describeDraftBuilderRuleTool = (builder: RuleBuilderType): string =>
  `Create a ${builder.title} alerting V2 rule in the conversation from builder params. ${
    builder.summary
  }

${builder.whenToUse}

The tool generates the rule's ES|QL query, time field, grouping and recovery from \`params\`: never write ES|QL for this builder. Use \`settings\` for the name, kind, schedule and the other settings every rule shares; a new rule needs \`set_metadata\` with a name. When the settings leave them out, the kind defaults to \`${
    BUILDER_RULE_DEFAULTS.kind
  }\` and the schedule to every ${BUILDER_RULE_DEFAULTS.schedule.every}.

Every call validates the whole rule, so a successful result is ready to save.

To change a rule this tool created earlier in the same turn, call it again with its \`ruleAttachmentId\` and the full params. In later turns, edit the rule with the tools its attachment lists.

${ATTACHMENT_ONLY_NOTE}

Examples of \`params\`:
${describeExamples(builder)}

Use settings[] to:
${generateRuleSettingsUsageList()}`;

export const describeUpdateBuilderRuleTool = (
  builder: RuleBuilderType,
  attachmentId: string
): string =>
  `Change the ${
    builder.title
  } rule in rule attachment "${attachmentId}". Applies only to that attachment.

\`params\` patches the builder params: each field sent replaces its current value wholesale, including arrays, and fields left out keep their current value. Send the whole array to change one item in it. The tool regenerates the rule's ES|QL query, time field, grouping and recovery from the result: never write ES|QL for this rule.

\`settings\` changes the settings every rule shares. Send \`params\`, \`settings\` or both. Every call validates the whole rule.

If the user asks for something the ${
    builder.title
  } builder can't express, call \`${getConvertToCustomRuleToolId(attachmentId)}\` first.

${ATTACHMENT_ONLY_NOTE}

Use settings[] to:
${generateRuleSettingsUsageList()}`;

export const describeConvertToCustomRuleTool = (
  builderTitle: string,
  attachmentId: string
): string =>
  `Turn the ${builderTitle} rule in rule attachment "${attachmentId}" into a custom ES|QL rule, keeping its current query and settings. Applies only to that attachment.

Call this only when the user asks for something the ${builderTitle} builder can't express, such as joins or custom ES|QL. The rule can no longer be edited with the builder afterwards. Then edit it with \`${ALERTING_TOOL_IDS.draftCustomRule}\` and \`ruleAttachmentId: "${attachmentId}"\`.

${ATTACHMENT_ONLY_NOTE}`;

/** The edit guidance shown in a builder rule attachment's representation. */
export const describeBuilderRuleTools = (builder: RuleBuilderType, attachmentId: string): string =>
  `Authored with the ${builder.title} rule builder. Edit it with \`${getUpdateBuilderRuleToolId(
    builder,
    attachmentId
  )}\`, which takes builder params, not ES|QL. Only if the change needs ES|QL the builder can't express, call \`${getConvertToCustomRuleToolId(
    attachmentId
  )}\` first.`;
