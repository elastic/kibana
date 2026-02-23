/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_PRIVILEGES_SKILL = defineSkillType({
  id: 'platform.privileges',
  name: 'privileges',
  basePath: 'skills/platform',
  description:
    'Explain permission errors by checking current user and saved object privileges (read-only)',
  content: `# Platform Privileges

## What this skill does
Helps you explain why certain actions fail by checking the current user and (when available) saved object privileges.

## Tools and operations
- Use \`platform.core.privileges\`:\n
  - \`current_user\`\n
  - \`check_saved_objects\` (if Security authz is available)\n

## When to use
- A tool returns an authorization error and you need to explain next steps.\n
`,
  getAllowedTools: () => ['platform.core.privileges'],
});
