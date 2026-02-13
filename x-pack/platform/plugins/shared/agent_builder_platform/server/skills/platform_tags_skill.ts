/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_TAGS_SKILL = defineSkillType({
  id: 'platform.tags',
  name: 'tags',
  basePath: 'skills/platform',
  description: 'List/create/update tags and assign tags to saved objects safely',
  content: `# Platform Tags

## What this skill does
Helps you manage **tags** and assign them to taggable saved objects (dashboards, lens, searches, etc.).

## Tools and operations
- Use \`platform.core.tags\`:\n
  - \`list\`, \`get\` (read-only)\n
  - \`create\`, \`update\`, \`update_object_tags\` (**require \`confirm: true\`**)\n

## Response format (CRITICAL)
After calling the tool, respond **directly and concisely** using only the tool results.\n

1. Start with the total count (e.g. \"Found N tags\" or \"No tags found\").\n
2. When listing tags, output a **markdown table** with the most relevant fields:\n
   - Tag name and ID\n
   - Color if configured\n
   - Description if available\n
3. **Never guess** tag properties. If a field isn't present in tool results, omit it or use \"—\".\n
4. **Do not include** explanations of how tags work, background info, or follow-up suggestions unless the user asked.\n

## Safe workflow
1) List existing tags first to avoid duplicates.\n
2) For any write (create/update/assignment), restate the intended changes and require user confirmation.\n
3) Call with \`confirm: true\`.\n
`,
  getAllowedTools: () => ['platform.core.tags'],
});
