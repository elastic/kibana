/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_VISUALIZATION_SKILL: Skill = {
  namespace: 'platform.visualization',
  name: 'Platform Visualization',
  description: 'Create and update visualizations safely',
  content: `# Platform Visualization

## What this skill does
Helps you create or update Lens visualizations with clear defaults and minimal surprises.

## When to use
- The user wants a chart/table for a specific question.
- You need a visualization to embed in a dashboard.

## Inputs to ask the user for
- **Metric** (count/sum/avg/etc.)
- **Breakdown** (terms/top-N)
- **Filters** and **time range**
- Preferred chart type (bar/line/area/table)

## Safe workflow
1) Restate the question as a chart spec (metric, breakdown, filters).\n
2) Build a minimal visualization first.\n
3) Iterate with user feedback.\n
4) Avoid destructive changes to existing objects; prefer copy/update with clear intent.\n
`,
  tools: [createToolProxy({ toolId: platformCoreTools.createVisualization })],
};



