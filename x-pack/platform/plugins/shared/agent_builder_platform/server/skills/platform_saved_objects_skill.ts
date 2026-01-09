/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_SAVED_OBJECTS_SKILL: Skill = {
  namespace: 'platform.saved_objects',
  name: 'Platform Saved Objects',
  description: 'Find, get, create, and update saved objects safely',
  content: `# Platform Saved Objects

## What this skill does
Helps you safely find and inspect Kibana saved objects, and perform **explicit, versioned updates** when the user asks.

## When to use
- You need to locate dashboards, visualizations, searches, data views, etc.
- The user wants a safe update to a saved object.

## Inputs to ask the user for
- **Saved object type** (e.g. \`dashboard\`, \`visualization\`, \`index-pattern\`)
- **Search criteria** (name/title, tags, id)
- For updates: **exact fields to change** (small, specific)

## Tools and operations
- Use \`platform.core.saved_objects\`:\n
  - \`find\`, \`get\` (read-only)\n
  - \`create\`, \`update\` (**requires \`confirm: true\`**)\n

## Safe workflow
1) \`find\` candidates and present a short list.\n
2) \`get\` the chosen object and summarize key attributes.\n
3) For writes, restate the change and require user confirmation.\n
4) Call \`create\`/ \`update\` with \`confirm: true\`.\n

## Example
- **User**: “Update dashboard X title to Y.”\n
- **Assistant**: \`find\` dashboard, \`get\` it, ask “Confirm update?” then \`update\` with \`confirm: true\`.
`,
  tools: [createToolProxy({ toolId: platformCoreTools.savedObjects })],
};



