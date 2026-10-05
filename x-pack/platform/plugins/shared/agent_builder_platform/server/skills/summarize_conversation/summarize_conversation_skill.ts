/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const SUMMARIZE_CONVERSATION_SKILL_ID = 'summarize-conversation';

export const summarizeConversationSkill = defineSkillType({
  id: SUMMARIZE_CONVERSATION_SKILL_ID,
  name: 'summarize-conversation',
  basePath: 'skills/platform/agent-builder',
  description:
    'Write a short summary of an investigation or escalation conversation. Used by the conversation summary workflow.',
  content: `## When to use this skill

Use this skill only when a workflow asks you to summarize an existing investigation or escalation conversation. The conversation id and template id are in the message.

## What to read

Read the full conversation before summarizing: every message and timeline event, attachments, metadata, and proposals linked to that conversation. Do not summarize from the latest message alone.

## Output

Return a short summary, about 3 to 5 sentences or a short bullet list, with this structure:

- **Trigger** — what alert or signal started this, and why
- **Timeline** — the key events and evidence
- **Conclusion** — what was found. When metadata status is \`closed\`, include whether proposals were accepted or rejected. Otherwise describe progress so far.

Frame the wording for the template:

- \`investigation\` in a security space: threat indicators, affected entities, MITRE mapping when it is present, alert severity.
- \`investigation\` in an observability space: affected services, error signals, impact, and what was done.
- \`escalation\`: the same framing, plus the linked investigations.

The workflow stores the summary. Do not write conversation metadata yourself, and do not add a chat reply beyond the structured summary.
`,
});
