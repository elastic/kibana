/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartTypeSelectionPromptContent } from '@kbn/agent-builder-visualizations-server';
import type { ReferencedContent } from '@kbn/agent-builder-server/skills/type_definition';
import { dashboardCompositionPrompt } from './composition';
import { gridLayoutPrompt } from './grid_layout';

/**
 * Shared visual good practices (chart types, composition, grid).
 * Referenced by dashboard-management — do not copy this text into other prompts.
 */
export const DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME = 'dashboard-design-practices';

export const dashboardDesignPracticesPrompt = `## Chart Type Selection

${getChartTypeSelectionPromptContent()}

${dashboardCompositionPrompt}

${gridLayoutPrompt}`;

export const dashboardDesignPracticesReference: ReferencedContent = {
  name: DASHBOARD_DESIGN_PRACTICES_REFERENCE_NAME,
  relativePath: '.',
  content: dashboardDesignPracticesPrompt,
};
