/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartTypeReviewPromptContent } from '@kbn/agent-builder-visualizations-server';
import {
  getDashboardDesignPromptContent,
  getDashboardReviewPromptContent,
  getDashboardReviewTopicsContent,
} from './dashboard_guidance';

describe('dashboard guidance', () => {
  it('shares design guidance with a sparse-row exception', () => {
    const design = getDashboardDesignPromptContent();
    expect(design).toContain('48-column grid');
    expect(design).toContain('sparse final KPI');
    expect(design).toContain('equally sized');
    expect(design).not.toContain('reflow every existing panel');
    expect(design).not.toContain('Stretch the last panel');
  });

  it('preserves existing panel identity and meaningful settings', () => {
    const review = getDashboardReviewTopicsContent();
    expect(review).toContain('newSections/newSectionKey');
    expect(review).toContain('preserving their IDs');
    expect(review).toContain('change only affected rows');
    expect(review).toContain('Preserve existing controls and filters');
    expect(review).not.toContain('exact phrase');
  });

  it('appends shared chart defaults once', () => {
    expect(getDashboardReviewPromptContent()).toBe(
      [getDashboardReviewTopicsContent(), getChartTypeReviewPromptContent()].join('\n')
    );
  });
});
