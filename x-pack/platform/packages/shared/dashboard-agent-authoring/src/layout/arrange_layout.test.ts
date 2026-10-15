/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type {
  AttachmentPanel,
  DashboardAttachmentData,
  DashboardSection,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { DASHBOARD_OPERATION_FAILURE_TYPES } from '../failure_types';
import { arrangeDashboardLayout } from './arrange_layout';
import type { ArrangeDashboardLayout, LayoutArrangement } from './types';

const createLensPanel = (id: string, y = 0): AttachmentPanel => ({
  type: LENS_EMBEDDABLE_TYPE,
  id,
  config: { type: 'metric', title: `Panel ${id}` },
  grid: { x: 0, y, w: 24, h: 9 },
});

const createSection = (
  id: string,
  y: number,
  panels: AttachmentPanel[] = []
): DashboardSection => ({
  id,
  title: `Section ${id}`,
  collapsed: false,
  grid: { y },
  panels,
});

const originalDashboardData: DashboardAttachmentData = {
  title: 'Dashboard',
  panels: [createLensPanel('existing'), createSection('section-a', 9, [createLensPanel('inner')])],
};

const dashboardWithNewPanel: DashboardAttachmentData = {
  ...originalDashboardData,
  panels: [...originalDashboardData.panels, createLensPanel('new-panel', 10)],
};

const completeArrangement: LayoutArrangement = {
  panels: [
    { id: 'existing', x: 0, y: 0, w: 48, h: 9 },
    { id: 'new-panel', x: 0, y: 9, w: 48, h: 9 },
    { id: 'inner', x: 0, y: 0, w: 12, h: 6 },
  ],
  sections: [{ id: 'section-a', y: 18 }],
};

describe('arrangeDashboardLayout', () => {
  let logger: Logger;
  let reportFailure: jest.Mock;

  beforeEach(() => {
    logger = { warn: jest.fn() } as unknown as Logger;
    reportFailure = jest.fn();
  });

  const arrange = (
    arrangeLayout: ArrangeDashboardLayout,
    {
      dashboardData = dashboardWithNewPanel,
      instructions,
    }: { dashboardData?: DashboardAttachmentData; instructions?: string } = {}
  ) =>
    arrangeDashboardLayout({
      originalPanels: originalDashboardData.panels,
      dashboardData,
      editedPanelIds: new Set(['existing']),
      panelAuthoringNotes: [{ panelId: 'new-panel', authoringNote: 'Shows total requests.' }],
      instructions,
      arrangeLayout,
      reportFailure,
      logger,
    });

  it('skips the layout call when the panels did not change and there is no layout request', async () => {
    const arrangeLayout = jest.fn();

    const result = await arrange(arrangeLayout, { dashboardData: originalDashboardData });

    expect(arrangeLayout).not.toHaveBeenCalled();
    expect(result).toBe(originalDashboardData);
  });

  it('calls the layout for unchanged panels when there is a layout request', async () => {
    const arrangeLayout = jest.fn(async () => ({
      panels: [
        { id: 'existing', x: 0, y: 0, w: 48, h: 9 },
        { id: 'inner', x: 0, y: 0, w: 48, h: 9 },
      ],
      sections: [{ id: 'section-a', y: 9 }],
    }));

    const result = await arrange(arrangeLayout, {
      dashboardData: originalDashboardData,
      instructions: 'make everything full width',
    });

    expect(arrangeLayout).toHaveBeenCalledWith(
      expect.objectContaining({ instructions: 'make everything full width' })
    );
    expect(result.panels[0].grid).toEqual({ x: 0, y: 0, w: 48, h: 9 });
  });

  it('sends the panels in reading order with what changed, and applies the arrangement', async () => {
    const arrangeLayout = jest.fn(async () => completeArrangement);

    const result = await arrange(arrangeLayout);

    expect(arrangeLayout).toHaveBeenCalledWith({
      panels: [
        expect.objectContaining({ id: 'existing', isNew: false, contentChanged: true }),
        expect.objectContaining({
          id: 'new-panel',
          chartType: 'metric',
          title: 'Panel new-panel',
          authoringNote: 'Shows total requests.',
          isNew: true,
          contentChanged: false,
        }),
      ],
      sections: [
        {
          id: 'section-a',
          title: 'Section section-a',
          y: 9,
          isNew: false,
          panels: [expect.objectContaining({ id: 'inner', isNew: false })],
        },
      ],
    });
    expect(result.panels).toEqual([
      expect.objectContaining({ id: 'existing', grid: { x: 0, y: 0, w: 48, h: 9 } }),
      expect.objectContaining({
        id: 'section-a',
        grid: { y: 18 },
        panels: [expect.objectContaining({ id: 'inner', grid: { x: 0, y: 0, w: 12, h: 6 } })],
      }),
      expect.objectContaining({ id: 'new-panel', grid: { x: 0, y: 9, w: 48, h: 9 } }),
    ]);
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it.each<[string, LayoutArrangement, string]>([
    [
      'misses a panel',
      {
        ...completeArrangement,
        panels: completeArrangement.panels.filter(({ id }) => id !== 'inner'),
      },
      'panel "inner" is missing',
    ],
    [
      'misses a section',
      { ...completeArrangement, sections: [] },
      'section "section-a" is missing',
    ],
    [
      'overflows the grid',
      {
        ...completeArrangement,
        panels: completeArrangement.panels.map((panel) =>
          panel.id === 'new-panel' ? { ...panel, x: 24, w: 48 } : panel
        ),
      },
      'panel "new-panel" overflows the 48-column grid',
    ],
  ])('keeps the current layout when the arrangement %s', async (_, arrangement, issue) => {
    const result = await arrange(async () => arrangement);

    expect(result).toBe(dashboardWithNewPanel);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(issue));
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('keeps the current layout when the layout call fails', async () => {
    const result = await arrange(async () => {
      throw new Error('Model unavailable');
    });

    expect(result).toBe(dashboardWithNewPanel);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Model unavailable'));
    expect(reportFailure).not.toHaveBeenCalled();
  });

  it('reports a failure when a layout request is made for a dashboard without panels', async () => {
    const arrangeLayout = jest.fn();
    const dashboardData: DashboardAttachmentData = { title: 'Dashboard', panels: [] };

    const result = await arrange(arrangeLayout, {
      dashboardData,
      instructions: 'make the table full width',
    });

    expect(arrangeLayout).not.toHaveBeenCalled();
    expect(result).toBe(dashboardData);
    expect(reportFailure).toHaveBeenCalledWith({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.layout,
      identifier: 'layout',
      error: expect.stringContaining('the dashboard has no panels'),
    });
  });

  it('reports a failure when a layout request is not applied', async () => {
    const result = await arrange(async () => ({ ...completeArrangement, sections: [] }), {
      instructions: 'make the new panel full width',
    });

    expect(result).toBe(dashboardWithNewPanel);
    expect(reportFailure).toHaveBeenCalledWith({
      type: DASHBOARD_OPERATION_FAILURE_TYPES.layout,
      identifier: 'layout',
      error: expect.stringContaining('section "section-a" is missing'),
    });
  });
});
