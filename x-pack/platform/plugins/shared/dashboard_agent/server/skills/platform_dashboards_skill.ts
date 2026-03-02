/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_DASHBOARD_SKILL = defineSkillType({
  id: 'platform.dashboards',
  name: 'dashboards',
  basePath: 'skills/dashboards',
  description: 'Create and update dashboards safely',
  content: `# Platform Dashboards

## What this skill does
Helps you create and update dashboards in a non-destructive way, focusing on incremental changes and clear user intent.

## When to use
- The user needs a new dashboard for a purpose/team.
- The user wants to add panels/filters/time settings to an existing dashboard.

## Inputs to ask the user for
- **Dashboard name/title**
- **Data sources** (data view/index pattern)
- **Panels desired** (visualization type + fields + breakdowns)
- **Time range / filters** to apply by default

## Safe workflow
1) Clarify the intended audience and key questions the dashboard should answer.\n
2) Propose panel layout (few panels first).\n
3) If applying changes, summarize exactly what will be created/updated.\n
4) Prefer saved-object versioned updates when writing.\n
`,
  getAllowedTools: () => [
    'platform.dashboard.create_dashboard',
    'platform.dashboard.update_dashboard',
  ],
});
