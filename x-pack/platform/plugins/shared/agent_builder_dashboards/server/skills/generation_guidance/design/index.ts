/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardCompositionPrompt } from './composition';
import { gridLayoutPrompt } from './grid_layout';

/**
 * Name of the referenced-content file (`<name>.md`) that holds the dashboard design
 * guidance (composition + panel layout). The skill exposes this content lazily via
 * `referencedContent` so the agent only pulls it in (with `read_file`) when it actually
 * composes or lays out a dashboard, instead of carrying it in the skill body up front.
 */
export const dashboardDesignReferenceName = 'dashboard-design';

export const dashboardDesignGuidancePrompt = `${dashboardCompositionPrompt}

${gridLayoutPrompt}`;
