/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_SPACES_SKILL: Skill = {
  namespace: 'platform.spaces',
  name: 'Platform Spaces',
  description: 'List/get spaces and determine the active space (read-only)',
  content: `# Platform Spaces

## What this skill does
Helps you understand and navigate **space scoping** in Kibana (read-only).

## Tools and operations
- Use \`${platformCoreTools.spaces}\`:\n
  - \`list\` spaces\n
  - \`get\` a specific space\n
  - \`get_active\` to identify the current request space\n

## When to use
- Tool calls behave differently between spaces and you need to confirm context.\n
`,
  tools: [createToolProxy({ toolId: platformCoreTools.spaces })],
};



