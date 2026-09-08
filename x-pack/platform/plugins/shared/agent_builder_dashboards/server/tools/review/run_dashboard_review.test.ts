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
import {
  listPanelIds,
  validateReview,
  runDashboardReview,
  REVIEW_TOOL_NAME,
} from './run_dashboard_review';
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
  dashboard_findings: [],
  new_sections: [],
  layout_changes: [],
  panel_findings: [],
  data_questions: [],
};

const finding = {
  problem: 'Title repeats the label.',
  correction: 'Remove the panel title.',
  appearance_only: true,
};

describe('listPanelIds', () => {
  it('lists every leaf panel in order, including section panels', () => {
    expect(listPanelIds(dashboard)).toEqual(['p1', 'p2', 'p3']);
  });
});

describe('validateReview', () => {
  it('derives no-issues panels from the reviewed list and flags panels the reviewer skipped', () => {
    const { review, unreviewedPanelIds } = validateReview(
      {
        ...emptyOutput,
        reviewed_panel_ids: ['p1', 'p2'],
        panel_findings: [{ panel_id: 'p2', findings: [finding] }],
      },
      dashboard,
      createLogger()
    );

    expect(review.no_issues_panel_ids).toEqual(['p1']);
    expect(review.panel_findings).toEqual([{ panel_id: 'p2', findings: [finding] }]);
    expect(unreviewedPanelIds).toEqual(['p3']);
  });

  it('treats panels with findings or a could_not_assess entry as covered even when not listed as reviewed', () => {
    const { review, unreviewedPanelIds } = validateReview(
      {
        ...emptyOutput,
        reviewed_panel_ids: ['p1'],
        panel_findings: [{ panel_id: 'p2', findings: [finding] }],
        could_not_assess: [{ panel_id: 'p3', reason: 'DSL panel' }],
      },
      dashboard,
      createLogger()
    );

    expect(unreviewedPanelIds).toEqual([]);
    expect(review.could_not_assess).toEqual([{ panel_id: 'p3', reason: 'DSL panel' }]);
  });

  it('drops entries for unknown panels and keeps the first findings entry per panel', () => {
    const { review, unreviewedPanelIds } = validateReview(
      {
        ...emptyOutput,
        reviewed_panel_ids: ['p1', 'p2', 'p3', 'ghost'],
        panel_findings: [
          { panel_id: 'ghost', findings: [finding] },
          { panel_id: 'p1', findings: [finding] },
          { panel_id: 'p1', findings: [{ ...finding, correction: 'second' }] },
        ],
      },
      dashboard,
      createLogger()
    );

    expect(unreviewedPanelIds).toEqual([]);
    expect(review.panel_findings).toEqual([{ panel_id: 'p1', findings: [finding] }]);
    expect(review.no_issues_panel_ids).toEqual(['p2', 'p3']);
  });

  it('keeps layout changes that target existing sections, new section keys, or the top level', () => {
    const { review } = validateReview(
      {
        ...emptyOutput,
        reviewed_panel_ids: ['p1', 'p2', 'p3'],
        new_sections: [{ key: 'overview', title: 'Overview', y: 0 }],
        layout_changes: [
          { panel_id: 'p1', section: 'overview', grid },
          { panel_id: 'p2', section: 's1', grid },
          { panel_id: 'p3', section: null, grid },
          { panel_id: 'p3', section: 'missing-section', grid },
          { panel_id: 'ghost', section: null, grid },
        ],
      },
      dashboard,
      createLogger()
    );

    expect(review.layout_changes.map(({ panel_id: id, section }) => [id, section])).toEqual([
      ['p1', 'overview'],
      ['p2', 's1'],
      ['p3', null],
    ]);
  });
});

describe('runDashboardReview', () => {
  it('runs a fresh-context structured review with the default model and validates the result', async () => {
    const invoke = jest.fn().mockResolvedValue({
      ...emptyOutput,
      reviewed_panel_ids: ['p1'],
      panel_findings: [{ panel_id: 'p1', findings: [finding] }],
    });
    const withStructuredOutput = jest.fn().mockReturnValue({ invoke });
    const modelProvider = {
      getDefaultModel: jest.fn().mockResolvedValue({ chatModel: { withStructuredOutput } }),
    } as unknown as ModelProvider;

    const { review, unreviewedPanelIds } = await runDashboardReview({
      dashboardData: dashboard,
      userRequest: 'prettify this dashboard, keep the gauge goal',
      screenshot: { base64: 'AAAA', mimeType: 'image/png' },
      modelProvider,
      logger: createLogger(),
    });

    expect(withStructuredOutput).toHaveBeenCalledWith(expect.anything(), {
      name: REVIEW_TOOL_NAME,
    });
    const [messages] = invoke.mock.calls[0];
    expect(messages).toHaveLength(2);
    expect(messages[0][0]).toBe('system');
    const humanContent = messages[1].content as Array<{ type: string; text?: string }>;
    expect(humanContent[0].text).toContain(
      '<user_request>prettify this dashboard, keep the gauge goal</user_request>'
    );
    expect(humanContent[0].text).toContain('"id":"p3"');
    expect(humanContent[1].type).toBe('image_url');

    expect(review.panel_findings).toEqual([{ panel_id: 'p1', findings: [finding] }]);
    expect(unreviewedPanelIds).toEqual(['p2', 'p3']);
  });
});
