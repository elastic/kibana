/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_CONNECTORS_ACTIONS_SKILL: Skill = {
  namespace: 'platform.connectors_actions',
  name: 'Platform Connectors',
  description: 'List and inspect action connectors (no execution by default)',
  content: `# Platform Connectors

## What this skill does
Helps you list and inspect Action connectors (read-only).

## When to use
- The user wants to see what connectors exist (Slack/Jira/ServiceNow/etc.).
- You need a connector id/name to configure another workflow/rule.

## Inputs to ask the user for
- Optional: connector type/name filter (if they have many)

## Tools and operations
- Use \`platform.core.connectors\`:\n
  - \`list\` and \`get\`\n

## Guardrails
- This skill does **not** execute connectors by default.\n
`,
  tools: [createToolProxy({ toolId: platformCoreTools.connectors })],
};



