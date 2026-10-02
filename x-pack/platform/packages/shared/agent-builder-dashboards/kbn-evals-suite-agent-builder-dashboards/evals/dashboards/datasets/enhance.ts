/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardDatasetExample } from '../../../src/evaluate_dataset';
import { enhanceExample } from './factories';

/**
 * Enhance (prettify) over one seeded dashboard with declared defects. The
 * first prompt is the one the "Enhance this dashboard" action sends: the
 * `/dashboards` skill badge, which asks the agent to load the skill, plus the
 * request. The agent should ask for the mode and is answered "Appearance only".
 */
export const DASHBOARD_ENHANCE_EXAMPLES: DashboardDatasetExample[] = [
  enhanceExample({
    question: '[/dashboards](skill://dashboards) Enhance this dashboard',
    mode: 'appearance',
    asksMode: true,
  }),
  enhanceExample({
    question: 'Enhance the attached dashboard. Appearance only: keep every panel and query.',
    mode: 'appearance',
    asksMode: false,
  }),
  enhanceExample({
    question: 'Enhance the attached dashboard, appearance and content.',
    mode: 'content',
    asksMode: false,
  }),
];
