/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { validateReview, runDashboardReview, REVIEW_TOOL_NAME } from './run_dashboard_review';
import type { DashboardReviewOutput } from './review_result';

const createLogger = (): Logger =>
  ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() } as unknown as Logger);

const grid = { x: 0, y: 0, w: 12, h: 5 };
const lensPanel = (id: string) => ({
  type: LENS_EMBEDDABLE_TYPE,
  id,
  grid,
  config: { type: 'metric', data_source: { type: 'esql', query: 'FROM a | STATS c = COUNT(*)' } },
});

const dashboard: DashboardAttachmentData = {
  title: 'Test',
  panels: [
    lensPanel('p1'),
    lensPanel('p2'),
    { id: 's1', title: 'Trends', collapsed: false, grid: { y: 5 }, panels: [lensPanel('p3')] },
  ],
};

const emptyOutput: DashboardReviewOutput = {
  reviewed_panel_ids: [],
  could_not_assess: [],
  panel_findings: [],
};

const finding = 'Remove the panel title.';

describe('validateReview', () => {
  it('retains assessed panels and identifies omitted panels inside sections', () => {
    expect(
      validateReview(
        {
          ...emptyOutput,
          reviewed_panel_ids: ['p1', 'p2'],
          panel_findings: [{ panel_id: 'p2', findings: [finding] }],
        },
        dashboard
      )
    ).toEqual({
      panel_findings: [{ panel_id: 'p2', findings: [finding] }],
      reviewed_panel_ids: ['p1', 'p2'],
      could_not_assess: [],
      unreviewed_panel_ids: ['p3'],
    });
  });

  it('counts findings as assessed and distinguishes unsupported panels from omissions', () => {
    expect(
      validateReview(
        {
          ...emptyOutput,
          panel_findings: [{ panel_id: 'p2', findings: [finding] }],
          could_not_assess: [{ panel_id: 'p3', reason: 'DSL panel' }],
        },
        dashboard
      )
    ).toEqual({
      panel_findings: [{ panel_id: 'p2', findings: [finding] }],
      reviewed_panel_ids: ['p2'],
      could_not_assess: [{ panel_id: 'p3', reason: 'DSL panel' }],
      unreviewed_panel_ids: ['p1'],
    });
  });

  it('drops unknown ids and combines duplicate findings without losing corrections', () => {
    const otherFinding = 'Hide the legend.';
    const output: DashboardReviewOutput = {
      reviewed_panel_ids: ['p1', 'p2', 'p2', 'ghost'],
      panel_findings: [
        { panel_id: 'ghost', findings: [finding] },
        { panel_id: 'p1', findings: [finding] },
        { panel_id: 'p1', findings: [otherFinding] },
      ],
      could_not_assess: [
        { panel_id: 'ghost', reason: 'Unknown' },
        { panel_id: 'p3', reason: 'DSL panel' },
        { panel_id: 'p3', reason: 'DSL panel' },
      ],
    };
    const original = structuredClone(output);

    expect(validateReview(output, dashboard)).toEqual({
      panel_findings: [{ panel_id: 'p1', findings: [finding, otherFinding] }],
      reviewed_panel_ids: ['p1', 'p2'],
      could_not_assess: [{ panel_id: 'p3', reason: 'DSL panel' }],
      unreviewed_panel_ids: [],
    });
    expect(output).toEqual(original);
  });

  it('preserves uncertainty on a panel that also has actionable findings', () => {
    const review = validateReview(
      {
        ...emptyOutput,
        panel_findings: [{ panel_id: 'p1', findings: [finding] }],
        could_not_assess: [{ panel_id: 'p1', reason: 'Duration unit is unknown.' }],
      },
      dashboard
    );

    expect(review.panel_findings).toEqual([{ panel_id: 'p1', findings: [finding] }]);
    expect(review.could_not_assess).toEqual([
      { panel_id: 'p1', reason: 'Duration unit is unknown.' },
    ]);
    expect(review.unreviewed_panel_ids).toEqual(['p2', 'p3']);
  });
});

describe('runDashboardReview', () => {
  it('reviews panel presentation once with the fast model and validates coverage', async () => {
    const invoke = jest.fn().mockResolvedValue({
      ...emptyOutput,
      reviewed_panel_ids: ['p1'],
      panel_findings: [{ panel_id: 'p1', findings: [finding] }],
    });
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const modelProvider = {
      selectModel: jest.fn().mockResolvedValue({ chatModel: { withStructuredOutput } }),
    } as unknown as ModelProvider;
    const userPreferences = 'Keep the existing colors.';

    const review = await runDashboardReview({
      dashboardData: dashboard,
      userPreferences,
      screenshot: { base64: 'AAAA', mimeType: 'image/png' },
      modelProvider,
      logger: createLogger(),
    });

    expect(modelProvider.selectModel).toHaveBeenCalledWith({ effortLevel: 'low' });
    expect(withStructuredOutput).toHaveBeenCalledWith(expect.anything(), {
      name: REVIEW_TOOL_NAME,
    });
    expect(invoke).toHaveBeenCalledTimes(1);
    const [messages] = invoke.mock.calls[0];
    expect(messages).toHaveLength(2);
    expect(messages[0][0]).toBe('system');
    const humanContent = messages[1].content as Array<{ type: string; text?: string }>;
    expect(humanContent[0].text).toContain(
      `<user_preferences>${userPreferences}</user_preferences>`
    );
    expect(humanContent[0].text).toContain('"id":"p3"');
    expect(humanContent[0].text).not.toContain('"grid"');
    expect(humanContent[1].type).toBe('image_url');

    expect(review).toEqual({
      panel_findings: [{ panel_id: 'p1', findings: [finding] }],
      reviewed_panel_ids: ['p1'],
      could_not_assess: [],
      unreviewed_panel_ids: ['p2', 'p3'],
    });
  });
});
