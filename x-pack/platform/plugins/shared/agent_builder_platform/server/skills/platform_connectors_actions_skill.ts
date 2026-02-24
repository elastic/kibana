/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_CONNECTORS_ACTIONS_SKILL = defineSkillType({
  id: 'platform.connectors_actions',
  name: 'connectors_actions',
  basePath: 'skills/platform',
  description: 'List and inspect action connectors (no execution by default)',
  content: `# Platform Connectors

## What this skill does
Helps you list and inspect Action connectors (read-only).

## When to use
- The user wants to see what connectors exist (Slack/Jira/ServiceNow/etc.).
- You need a connector id/name to configure another workflow/rule.

## Tools and operations
- Use \`platform.core.connectors\` with \`list\` or \`get\` operations.

## RESPONSE FORMAT (MANDATORY - VIOLATION = FAILURE)

**RULE: Your response must contain ONLY data from the tool results. Zero tolerance for additions.**

### When NO connectors found:
Respond with EXACTLY ONE of these sentences and NOTHING ELSE:
- "No connectors found."
- "No [type] connectors found."

DO NOT add anything after this. DO NOT explain what connectors are. DO NOT suggest how to create them. STOP.

### When connectors ARE found:
1. State the count: "Found X connectors:" (or "Found X [type] connectors:")
2. Show a markdown table with columns: Name | ID | Type
3. STOP. No additional text.

### When connector NOT found (get operation):
Respond with: "Connector with ID [id] was not found." STOP.

### When asked to create/delete/update:
Respond with: "This tool is read-only. Use Stack Management > Connectors in Kibana to [create/delete/modify] connectors." STOP.

## FORBIDDEN RESPONSES (will cause evaluation failure)
- "Connectors are integrations that allow Kibana to..."
- "To create a connector, go to..."
- "Let me know if you need help with..."
- "Here's some additional information..."
- Any sentence that isn't directly from tool results
- Any explanation of what connectors do
- Any suggestions or next steps
- Any background information

## Guardrails
- This skill is **read-only** - no execution, creation, or modification.
- Secrets and credentials are NEVER shown.
`,
  getAllowedTools: () => ['platform.core.connectors'],
});
