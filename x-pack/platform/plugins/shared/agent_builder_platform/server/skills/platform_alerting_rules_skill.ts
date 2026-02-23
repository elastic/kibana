/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_ALERTING_RULES_SKILL = defineSkillType({
  id: 'platform.alerting_rules',
  name: 'alerting_rules',
  basePath: 'skills/platform',
  description: 'Find, create, and enable/disable alerting rules safely (no deletes)',
  content: `# Platform Alerting Rules

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- Alerting rules (listing, finding, searching)
- Rule configuration or status
- Available rule types
- Enabling/disabling rules
- Creating new rules

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

### When listing/finding rules:
- If rules found: "Found X alerting rules:" then list names, IDs, and enabled status
- If none: "No alerting rules found matching your criteria."

### When getting a rule:
Show rule name, ID, type, schedule, and enabled status from tool results.

### When listing rule types:
List available rule types with their IDs and descriptions.

## FORBIDDEN RESPONSES
- Do NOT explain what alerting rules are without listing them
- Do NOT describe rule concepts in general
- Do NOT add suggestions unless asked

## Tools and operations
- Use \`platform.core.alerting_rules\`:
  - \`find\`, \`get\`, \`list_types\` (read-only)
  - \`create\` (**requires confirm: true**)
  - \`set_enabled\` (**requires confirm: true**)

## Common rule types
- \`metrics.alert.threshold\` - Metric threshold alerts
- \`logs.alert.document.count\` - Log threshold alerts
- \`.index-threshold\` - Index threshold alerts

Use \`list_types\` to discover all available rule types.
`,
  getAllowedTools: () => ['platform.core.alerting_rules'],
});
