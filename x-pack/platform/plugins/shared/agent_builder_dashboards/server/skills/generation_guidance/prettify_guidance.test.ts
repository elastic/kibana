/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDashboardReviewPromptContent } from './dashboard_guidance';
import { getDashboardPrettifyPromptContent } from './prettify_guidance';

describe('getDashboardPrettifyPromptContent', () => {
  const content = getDashboardPrettifyPromptContent();

  it('leads with HITL categories including All of them', () => {
    expect(content).toContain('## Prettifying a Dashboard');
    expect(content).toContain('ask_user_question');
    expect(content).toContain('multi_select');
    expect(content).toContain('**Layout**');
    expect(content).toContain('**Chart styling**');
    expect(content).toContain('**Structure**');
    expect(content).not.toContain('never empty');
    expect(content).toContain('**All of them**');
    expect(content).toContain('Do not write findings');
    expect(content).toContain('issues belong only in the form option descriptions');
    expect(content).toContain('ask_user_question` alone');
    expect(content).toContain('one short clause per issue');
    expect(content).toContain('Treat **All of them** as every non-empty category');
    expect(content.indexOf('## Prettifying a Dashboard')).toBeLessThan(
      content.indexOf('## Dashboard Review')
    );
  });

  it('appends the dashboard review compile after HITL', () => {
    const review = getDashboardReviewPromptContent();

    expect(content.endsWith(review)).toBe(true);
  });
});
