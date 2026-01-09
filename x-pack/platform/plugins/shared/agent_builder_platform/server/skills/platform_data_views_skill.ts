/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_DATA_VIEWS_SKILL: Skill = {
  namespace: 'platform.data_views',
  name: 'Platform Data Views',
  description: 'Create and update data views safely',
  content: `# Platform Data Views

## What this skill does
Helps you find, inspect, create, and update **data views** (index patterns) safely.

## When to use
- The user needs a new data view for an index pattern (e.g. \`logs-*\`).
- A data view title/time field needs a small update.

## Inputs to ask the user for
- **Title** (index pattern), e.g. \`logs-*\`
- **Time field** (if time-based), e.g. \`@timestamp\`
- **Name** (optional display name)

## Tools and operations
- Use \`platform.core.data_views\`:\n
  - \`find\`, \`get\` (read-only)\n
  - \`create\`, \`update\` (**requires \`confirm: true\`**)\n

## Safe workflow
1) \`find\` to avoid duplicates.\n
2) \`get\` to confirm current config.\n
3) For writes, restate intended changes and ask for confirmation.\n
4) Call \`create\`/ \`update\` with \`confirm: true\`.\n
`,
  tools: [createToolProxy({ toolId: platformCoreTools.dataViews })],
};



