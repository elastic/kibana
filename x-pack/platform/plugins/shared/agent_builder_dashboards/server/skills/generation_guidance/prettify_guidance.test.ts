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

  it('reads the paired attachments and explains the missing-image fallback', () => {
    expect(content).toContain('Read the dashboard attachment');
    expect(content).toContain('Read the paired image attachment');
    expect(content).toContain('screenshot is missing or unreadable');
    expect(content).toContain('original screenshot is not visual verification');
  });

  it('asks about specific additions, not categories of repairs', () => {
    expect(content).toContain('Improve existing charts only');
    expect(content).toContain('Also add the suggested charts');
    expect(content).toContain('at most one focused data-discovery pass');
    expect(content).toContain('proceed without this question');
    expect(content).not.toContain('multi_select');
    expect(content).not.toContain('Apply only the review criticals');
  });

  it('batches presentation edits and avoids regeneration', () => {
    expect(content).toContain('Batch the agreed changes');
    expect(content).toContain('dashboardAttachmentId');
    expect(content).not.toContain('config.defaults');
    expect(content).toContain('config.changes');
    expect(content).toContain('defaults are guidance, not an operation');
    expect(content).toContain('Never modify queries, data sources, filters, aggregations');
    expect(content).toContain('Do not use source: "request" for styling');
    expect(content).toContain('per-panel failures');
    expect(content).not.toContain('exact phrase');
  });

  it('appends the shared visual policy', () => {
    expect(content.endsWith(getDashboardReviewPromptContent())).toBe(true);
  });

  it('does not override the original chart rules with blanket preservation instructions', () => {
    expect(content).toContain('Always omit panel titles on metric charts');
    expect(content).toContain('Keep at most one line (the primary overview trend)');
    expect(content).toContain(
      'Line-to-area restyling must keep the layer data and bindings unchanged'
    );
    expect(content).toContain('removing optional gauge metric.min, metric.max');
    expect(content).toContain('unless the user asked for those colors');
    expect(content).not.toContain('Preserve meaningful colors');
    expect(content).not.toContain('chart types, or layer membership');
  });
});
