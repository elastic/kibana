/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { generateDashboardTool } from '../tools';
import { skillContent } from './content/skill_content';

export const createDashboardManagementSkill = ({
  compileAllowList,
}: {
  compileAllowList?: SupportedChartType[];
} = {}) =>
  defineSkillType({
    id: 'dashboard-management',
    name: 'dashboard-management',
    basePath: 'skills/platform/dashboard',
    description:
      'Compose and update Kibana dashboards, involving panel creation, layout, and inline visualization editing.',
    content: skillContent,
    getInlineTools: () => [generateDashboardTool({ compileAllowList })],
  });

export const dashboardManagementSkill = createDashboardManagementSkill();
