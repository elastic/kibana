/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SkillDefinition } from '@kbn/agent-builder-server/skills';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { DASHBOARDS_SKILL_ID, dashboardTools } from '../../common';
import { generateDashboardTool, type GenerateDashboardToolDeps } from '../tools';
import { dashboardGeneration } from './generation_guidance';
import { kibanaRendering } from './rendering_guidance';

export const createDashboardsSkill = (deps: GenerateDashboardToolDeps): SkillDefinition =>
  defineSkillType({
    id: DASHBOARDS_SKILL_ID,
    name: DASHBOARDS_SKILL_ID,
    basePath: 'skills/platform/dashboard',
    description:
      'Compose and update Kibana dashboards, involving panel creation, layout, and inline visualization editing. Load once per conversation: after it is loaded, its instructions and the generate_dashboard tool stay available in later turns, so follow-up dashboard edits do not need it loaded again.',
    content: `## When to Use This Skill

Use this skill when:
- A user asks to find, list, inspect, or modify existing Kibana dashboards.
- A user asks to create a dashboard from one or more visualizations.
- A user asks to update a dashboard created earlier in the conversation.
- A request involves dashboard metadata, markdown, panel, or section changes.

Do **not** use this skill when:
- The user asks for a standalone visualization and does not mention a dashboard context.
- The user needs help exploring data, fields, or query logic.
- This skill was already loaded earlier in the conversation. Its instructions stay in that earlier result and the \`${dashboardTools.generateDashboard}\` tool stays available, so call the tool directly for follow-up edits.

${dashboardGeneration.guidance}

${kibanaRendering.guidance}
`,
    referencedContent: [
      ...(dashboardGeneration.referencedContent ?? []),
      ...(kibanaRendering.referencedContent ?? []),
    ],
    getInlineTools: () => [generateDashboardTool(deps)],
  });
