/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardCompositionPrompt } from './composition';
import { dashboardControlsPrompt } from './controls';
import { gridLayoutPrompt } from './grid_layout';

/**
 * Dashboard design guidance (composition, panel layout, controls), inlined into the skill body
 * so the agent always has it while building, editing, or prettifying a dashboard.
 */
export const dashboardDesignGuidancePrompt = [
  dashboardCompositionPrompt,
  gridLayoutPrompt,
  dashboardControlsPrompt,
]
  .map((prompt) => prompt.trim())
  .join('\n\n');
