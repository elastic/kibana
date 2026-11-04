/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { GENERATE_DASHBOARD_TOOL_ID } from '../extract_dashboard';
import {
  SECTIONED_LOGS_DASHBOARD,
  SECTIONED_LOGS_DASHBOARD_VISITORS_COLLAPSED,
} from '../fixtures/sectioned_logs_dashboard';
import { metric, panel } from '../test_helpers';
import { TOP_LEVEL, type LayoutEditGold } from '../types';
import { dashboardLayoutEditEvaluator } from './layout_edit';

const WRITE_STEP = {
  type: 'tool_call',
  tool_id: GENERATE_DASHBOARD_TOOL_ID,
  results: [{ type: 'dashboard', data: { attachment_id: 'seed' } }],
};

type Widgets = DashboardAttachmentData['panels'];

const edit = (change: (panels: Widgets) => Widgets, seed = SECTIONED_LOGS_DASHBOARD) => ({
  ...seed,
  panels: change(structuredClone(seed.panels)),
});

const inSection =
  (sectionId: string, change: (panels: AttachmentPanel[]) => AttachmentPanel[]) =>
  (panels: Widgets): Widgets =>
    panels.map((widget) =>
      isSection(widget) && widget.id === sectionId
        ? { ...widget, panels: change(widget.panels) }
        : widget
    );

const withoutPanel = (id: string) => (panels: AttachmentPanel[]) =>
  panels.filter((item) => item.id !== id);

const evaluateEdit = (
  layoutEdit: LayoutEditGold | undefined,
  dashboard: DashboardAttachmentData,
  { before = SECTIONED_LOGS_DASHBOARD, steps = [WRITE_STEP] } = {}
) =>
  dashboardLayoutEditEvaluator.evaluate({
    input: { question: 'q' },
    expected: { layoutEdit },
    metadata: undefined,
    output: { errors: [], messages: [], steps, before, dashboard },
  });

describe('dashboard layout edit evaluator', () => {
  const removeTopUrls: LayoutEditGold = { changes: ['traffic'], removed: ['top-urls'] };

  it('skips without gold and scores 0 when the agent never wrote the dashboard', async () => {
    expect((await evaluateEdit(undefined, SECTIONED_LOGS_DASHBOARD)).score).toBeNull();
    expect((await evaluateEdit(removeTopUrls, SECTIONED_LOGS_DASHBOARD, { steps: [] })).score).toBe(
      0
    );
  });

  it('passes an edit that changes only what the prompt asked', async () => {
    const result = await evaluateEdit(
      removeTopUrls,
      edit(inSection('traffic', withoutPanel('top-urls')))
    );
    expect(result.score).toBe(1);
  });

  it('fails a panel the prompt did not remove, and the container it left', async () => {
    const result = await evaluateEdit(
      { changes: [] },
      edit(inSection('traffic', withoutPanel('top-urls')))
    );
    expect(result.explanation).toContain('panels: missing [top-urls]');
    expect(result.explanation).toContain('stable.traffic: top-urls left the container');
  });

  it('fails a panel that joins a container the edit should not touch', async () => {
    const result = await evaluateEdit(
      { changes: [] },
      edit(
        inSection('errors', (panels) => [
          ...panels,
          panel('extra', { x: 0, y: 34, w: 48, h: 10 }, { type: 'datatable' }),
        ])
      )
    );
    expect(result.explanation).toContain('stable.errors: extra joined the container');
  });

  it('fails a reordered top level and an expanded collapsed section', async () => {
    const reordered = await evaluateEdit(
      { changes: [TOP_LEVEL] },
      edit((panels) =>
        panels.map((widget) =>
          widget.id === 'note' && !isSection(widget)
            ? { ...widget, grid: { ...widget.grid, y: 20 } }
            : widget
        )
      )
    );
    expect(reordered.explanation).toContain('outerOrder');

    const expanded = await evaluateEdit({ changes: [] }, SECTIONED_LOGS_DASHBOARD, {
      before: SECTIONED_LOGS_DASHBOARD_VISITORS_COLLAPSED,
    });
    expect(expanded.explanation).toBe('collapsed: expanded [visitors]');
  });

  it('checks where the prompt puts an added panel', async () => {
    const gold: LayoutEditGold = {
      changes: [TOP_LEVEL, 'errors'],
      placements: [{ item: { added: 'metric' }, in: TOP_LEVEL, beside: 'kpi-requests', w: 12 }],
    };
    const kpi = metric('kpi-average-bytes', { x: 0, y: 11, w: 12, h: 5 });

    const beside = await evaluateEdit(
      gold,
      edit((panels) => [...panels, { ...kpi, grid: { ...kpi.grid, y: 6 } }])
    );
    expect(beside.score).toBe(1);

    const misplaced = await evaluateEdit(
      gold,
      edit(inSection('errors', (panels) => [...panels, kpi]))
    );
    expect(misplaced.explanation).toContain('in errors, not top; not beside kpi-requests');
  });
});
