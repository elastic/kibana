/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_UI_SETTINGS_SKILL = defineSkillType({
  id: 'platform.ui_settings',
  name: 'ui_settings',
  basePath: 'skills/platform',
  description: 'Inspect advanced settings (read-only; sensitive values redacted by default)',
  content: `# Platform UI Settings

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- UI settings or advanced settings
- Kibana settings or configuration
- Default values (time zone, date format, etc.)
- User-provided or registered settings

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

### When getting settings:
- Show the setting name, value, and description from tool results
- If multiple settings: list as a table with Name, Value, Description

### When no settings found:
"No settings found matching your criteria."

## FORBIDDEN RESPONSES
- Do NOT explain what UI settings are in general
- Do NOT describe settings without fetching them
- Do NOT add suggestions unless asked

## Tools and operations
- Use \`platform.core.ui_settings\`:
  - \`get\` - get a specific setting
  - \`get_all\` - get all settings
  - \`get_user_provided\` - get user-modified settings
  - \`get_registered\` - get registered settings metadata

## Notes
- This skill is read-only
- Sensitive keys are redacted unless explicitly requested
`,
  getAllowedTools: () => ['platform.core.ui_settings'],
});
