/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_TAGS_SKILL: Skill = {
    namespace: 'platform.tags',
    name: 'Platform Tags',
    description: 'List/create/update tags and assign tags to saved objects safely',
    content: `# Platform Tags

## What this skill does
Helps you manage **tags** and assign them to taggable saved objects (dashboards, lens, searches, etc.).

## Tools and operations
- Use \`${platformCoreTools.tags}\`:\n
  - \`list\`, \`get\` (read-only)\n
  - \`create\`, \`update\`, \`update_object_tags\` (**require \`confirm: true\`**)\n

## Safe workflow
1) List existing tags first to avoid duplicates.\n
2) For any write (create/update/assignment), restate the intended changes and require user confirmation.\n
3) Call with \`confirm: true\`.\n
`,
    tools: [createToolProxy({ toolId: platformCoreTools.tags })],
};



