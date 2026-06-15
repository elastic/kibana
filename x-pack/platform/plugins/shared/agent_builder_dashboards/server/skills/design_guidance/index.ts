/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardCompositionPrompt } from './dashboard_composition_prompt';
import { gridLayoutPrompt } from './grid_layout_prompt';

export const dashboardDesignGuidancePrompt = `${dashboardCompositionPrompt}

${gridLayoutPrompt}`;
