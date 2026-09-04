/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getChartStyleRulesPromptContent,
  getLensPresentationEditGuidance,
} from '@kbn/agent-builder-visualizations-server';
import { getDashboardPrettifyPromptContent } from './prettify_guidance';

describe('getDashboardPrettifyPromptContent', () => {
  const content = getDashboardPrettifyPromptContent();

  it('walks through reading attachments, reviewing, asking, applying, and reporting', () => {
    expect(content).toContain('## Prettifying a Dashboard');
    expect(content).toContain('paired screenshot attachment');
    expect(content).toContain('Without a readable screenshot');
    expect(content).toContain('"Improve existing charts only" or "Also add the suggested charts"');
    expect(content).toContain('platform.dashboard.generate_dashboard');
    expect(content).toContain('source: "config", type: "vis", and config.changes');
    expect(content).toContain('does not verify the result');
  });

  it('includes the dashboard review checklist', () => {
    expect(content).toContain('## Dashboard Review Checklist');
    expect(content).toContain('Change only the affected rows and sections');
    expect(content).toContain('Move existing panels; do not recreate them');
  });

  it('appends the shared chart style rules and the edit syntax exactly once', () => {
    for (const block of [getChartStyleRulesPromptContent(), getLensPresentationEditGuidance()]) {
      expect(content.split(block)).toHaveLength(2);
    }
  });
});
