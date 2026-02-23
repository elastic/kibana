/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_SPACES_SKILL = defineSkillType({
  id: 'platform.spaces',
  name: 'spaces',
  basePath: 'skills/platform',
  description: 'List/get spaces and determine the active space (read-only)',
  content: `# Platform Spaces

## What this skill does
Helps you understand and navigate **space scoping** in Kibana (read-only).

## Tools and operations
- Use \`platform.core.spaces\`:\n
  - \`list\` spaces\n
  - \`get\` a specific space\n
  - \`get_active\` to identify the current request space\n

## When to use
- Tool calls behave differently between spaces and you need to confirm context.\n
`,
  getAllowedTools: () => ['platform.core.spaces'],
});
