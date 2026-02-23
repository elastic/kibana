/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_VISUALIZATION_SKILL = defineSkillType({
  id: 'platform.visualization',
  name: 'visualization',
  basePath: 'skills/platform',
  description: 'Create and update visualizations safely',
  content: `# Platform Visualization

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks for ANY of these:
- Create a visualization/chart/graph
- Make a bar chart, line chart, pie chart, table, etc.
- Visualize data from an index
- Show metrics or aggregations in visual form

**ALWAYS call the tool - do NOT describe how to create visualizations without actually creating one.**

## RESPONSE FORMAT (MANDATORY)

### When visualization is created:
1. State that the visualization was created successfully
2. Briefly describe what it shows (metric, breakdown, chart type)
3. Mention where it can be found or how to use it

Example: "Created a bar chart showing document count by host.name from logs-*. The visualization is ready for use."

### When clarification is needed:
Ask for: data source (index), metric to show, how to break it down, and preferred chart type.

## FORBIDDEN RESPONSES
- Do NOT explain how to create visualizations without creating one
- Do NOT describe Kibana UI steps instead of using the tool
- Do NOT suggest alternatives without attempting to create the visualization

## What this skill does
Helps you create or update Lens visualizations with clear defaults and minimal surprises.

## Inputs to ask the user for
- **Metric** (count/sum/avg/etc.)
- **Breakdown** (terms/top-N)
- **Filters** and **time range**
- Preferred chart type (bar/line/area/table)
`,
  getAllowedTools: () => ['platform.core.create_visualization'],
});
