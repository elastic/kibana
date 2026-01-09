/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_ALERTING_RULES_SKILL: Skill = {
  namespace: 'platform.alerting_rules',
  name: 'Platform Alerting Rules',
  description: 'Find and enable/disable rules safely (no deletes)',
  content: `# Platform Alerting Rules

## What this skill does
Helps you inspect alerting rules and **explicitly enable/disable** them safely.

## When to use
- The user wants to check a rule’s configuration/health.
- The user explicitly wants a rule enabled or disabled.

## Inputs to ask the user for
- **Rule id** (preferred) or identifying details (name, tag, rule type)
- For enable/disable: an explicit “yes, do it” confirmation

## Tools and operations
- Use \`platform.core.alerting_rules\`:\n
  - \`find\`, \`get\` (read-only)\n
  - \`set_enabled\` (**requires \`confirm: true\`**)\n

## Safe workflow
1) \`find\` the rule(s) and confirm the exact target.\n
2) \`get\` and summarize what the rule does.\n
3) For enable/disable, restate the impact and require confirmation.\n
4) Call \`set_enabled\` with \`confirm: true\`.\n
`,
  tools: [createToolProxy({ toolId: platformCoreTools.alertingRules })],
};



