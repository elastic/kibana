/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_UI_SETTINGS_SKILL: Skill = {
  namespace: 'platform.ui_settings',
  name: 'Platform UI Settings',
  description: 'Inspect advanced settings (read-only; sensitive values redacted by default)',
  content: `# Platform UI Settings

## What this skill does
Helps you inspect advanced settings (uiSettings) to explain behavior differences (time defaults, formatting, etc.).

## Tools and operations
- Use \`${platformCoreTools.uiSettings}\`:\n
  - \`get\`, \`get_all\`, \`get_user_provided\`, \`get_registered\`\n

## Notes
- Sensitive keys are redacted unless \`includeSensitive: true\` is explicitly requested.\n
`,
  tools: [createToolProxy({ toolId: platformCoreTools.uiSettings })],
};



