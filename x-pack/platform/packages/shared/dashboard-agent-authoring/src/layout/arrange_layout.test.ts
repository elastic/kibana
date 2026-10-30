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
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown-schemas';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { DASHBOARD_FAILURE_TYPES } from '../failure_types';
import { arrangeDashboardLayout } from './arrange_layout';
import type { ArrangeDashboardLayout, LayoutArrangement, LayoutRequest } from './types';

const createLensPanel = (id: string, y = 0, chartType = 'metric'): AttachmentPanel => ({
  type: LENS_EMBEDDABLE_TYPE,
  id,
  config: { type: chartType, title: `Panel ${id}` },
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
  plan: '',
  panels: [
    { id: 'p1', x: 0, y: 0, w: 48, h: 9 },
    { id: 'p3', x: 0, y: 9, w: 48, h: 9 },
  ],
  sections: [{ id: 's1', y: 18, panels: [{ id: 'p2', x: 0, y: 0, w: 12, h: 6 }] }],
};

describe('arrangeDashboardLayout', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = { warn: jest.fn() } as unknown as Logger;
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
      instructions,
      arrangeLayout,
      logger,
    });

  it('skips the layout call when no change affects the layout and there is no layout request', async () => {
    const arrangeLayout = jest.fn();
    const dashboardWithRetitledPanel: DashboardAttachmentData = {
      ...originalDashboardData,
      panels: [
        { ...createLensPanel('existing'), config: { type: 'metric', title: 'Renamed' } },
        originalDashboardData.panels[1],
      ],
    };

    const result = await arrange(arrangeLayout, { dashboardData: dashboardWithRetitledPanel });

    expect(arrangeLayout).not.toHaveBeenCalled();
    expect(result.dashboardData).toBe(dashboardWithRetitledPanel);
  });

  it('calls the layout for a chart type change, with the chart type the grid was sized for', async () => {
    const arrangeLayout = jest.fn(async () => ({
      plan: '',
      panels: [{ id: 'p1', x: 0, y: 0, w: 48, h: 10 }],
      sections: [{ id: 's1', y: 10, panels: [{ id: 'p2', x: 0, y: 0, w: 24, h: 9 }] }],
    }));
    const dashboardWithNewChartType: DashboardAttachmentData = {
      ...originalDashboardData,
      panels: [createLensPanel('existing', 0, 'xy'), originalDashboardData.panels[1]],
    };

    await arrange(arrangeLayout, { dashboardData: dashboardWithNewChartType });

    expect(arrangeLayout).toHaveBeenCalledWith(
      expect.objectContaining({
        panels: [
          expect.objectContaining({
            id: 'p1',
            chartType: 'xy',
            grid: expect.any(Object),
            retypedFrom: { type: LENS_EMBEDDABLE_TYPE, chartType: 'metric' },
          }),
        ],
        sections: [
          expect.objectContaining({
            panels: [expect.not.objectContaining({ retypedFrom: expect.anything() })],
          }),
        ],
      })
    );
  });

  it('writes only whole panel ids in the instructions as short ids', async () => {
    const arrangeLayout = jest.fn(async () => completeArrangement);

    await arrange(arrangeLayout, {
      dashboardData: {
        title: 'Dashboard',
        panels: [createLensPanel('panel-1'), createLensPanel('panel-10', 9)],
      },
      instructions: 'make panel-10 full width, below `panel-1`',
    });

    expect(arrangeLayout).toHaveBeenCalledWith(
      expect.objectContaining({ instructions: 'make p2 full width, below `p1`' })
    );
  });

  it('sends the dashboard with short ids, without the grids of new panels, and applies the arrangement', async () => {
    const arrangeLayout = jest.fn(async () => completeArrangement);

    const result = await arrange(arrangeLayout);

    const existingPanel = {
      id: 'p1',
      type: LENS_EMBEDDABLE_TYPE,
      chartType: 'metric',
      title: 'Panel existing',
    };
    expect(arrangeLayout).toHaveBeenCalledWith({
      panels: [
        { ...existingPanel, grid: { x: 0, y: 0, w: 24, h: 9 } },
        { ...existingPanel, id: 'p3', title: 'Panel new-panel' },
      ],
      sections: [
        {
          id: 's1',
          title: 'Section section-a',
          y: 9,
          panels: [
            { ...existingPanel, id: 'p2', title: 'Panel inner', grid: { x: 0, y: 0, w: 24, h: 9 } },
          ],
        },
      ],
    });
    expect(result.dashboardData.panels).toEqual([
      expect.objectContaining({ id: 'existing', grid: { x: 0, y: 0, w: 48, h: 9 } }),
      expect.objectContaining({
        id: 'section-a',
        grid: { y: 18 },
        panels: [expect.objectContaining({ id: 'inner', grid: { x: 0, y: 0, w: 12, h: 6 } })],
      }),
      expect.objectContaining({ id: 'new-panel', grid: { x: 0, y: 9, w: 48, h: 9 } }),
    ]);
    expect(result.failure).toBeUndefined();
  });

  it('sends a new dashboard without grids or section rows', async () => {
    const arrangeLayout = jest.fn(async () => completeArrangement);

    await arrangeDashboardLayout({
      originalPanels: [],
      dashboardData: dashboardWithNewPanel,
      arrangeLayout,
      logger,
    });

    const [[{ panels, sections }]] = arrangeLayout.mock.calls as unknown as [[LayoutRequest]];
    expect([...panels, ...sections.flatMap((section) => section.panels)]).toEqual(
      expect.not.arrayContaining([expect.objectContaining({ grid: expect.anything() })])
    );
    expect(sections[0].y).toBeUndefined();
  });

  it('sends panels moved to another container with their size only and the space they left, and new sections without a row', async () => {
    const arrangeLayout = jest.fn(async () => completeArrangement);
    const dashboardWithMovedPanels: DashboardAttachmentData = {
      ...originalDashboardData,
      panels: [
        createLensPanel('inner'),
        createSection('section-a', 9),
        createSection('section-b', 10, [createLensPanel('existing')]),
      ],
    };

    await arrange(arrangeLayout, { dashboardData: dashboardWithMovedPanels });

    const [[{ panels, sections }]] = arrangeLayout.mock.calls as unknown as [[LayoutRequest]];
    expect(panels[0]).toEqual(expect.objectContaining({ id: 'p1', size: { w: 24, h: 9 } }));
    expect(panels[0].grid).toBeUndefined();
    expect(sections).toEqual([
      expect.objectContaining({
        id: 's1',
        y: 9,
        panels: [],
        removed: [{ x: 0, y: 0, w: 24, h: 9 }],
      }),
      {
        id: 's2',
        title: 'Section section-b',
        panels: [expect.not.objectContaining({ grid: expect.anything() })],
      },
    ]);
  });

  it('calls the layout when a panel was removed, with the space it left', async () => {
    const arrangeLayout = jest.fn(async () => ({
      plan: '',
      panels: [],
      sections: [{ id: 's1', y: 0, panels: [{ id: 'p1', x: 0, y: 0, w: 48, h: 9 }] }],
    }));

    await arrange(arrangeLayout, {
      dashboardData: { ...originalDashboardData, panels: [originalDashboardData.panels[1]] },
    });

    expect(arrangeLayout).toHaveBeenCalledWith({
      panels: [],
      removed: [{ x: 0, y: 0, w: 24, h: 9 }],
      sections: [expect.objectContaining({ id: 's1', y: 9 })],
    });
  });

  it('keeps the grids of a section returned without panels and moves its row', async () => {
    const arrangeLayout = jest.fn(async () => ({
      ...completeArrangement,
      sections: [{ id: 's1', y: 18, panels: [] }],
    }));

    const result = await arrange(arrangeLayout);

    const [[{ sections }]] = arrangeLayout.mock.calls as unknown as [[LayoutRequest]];
    expect(sections[0].panels).toEqual([expect.objectContaining({ id: 'p2' })]);
    expect(result.failure).toBeUndefined();
    expect(result.dashboardData.panels[1]).toEqual(
      expect.objectContaining({
        id: 'section-a',
        grid: { y: 18 },
        panels: [expect.objectContaining({ id: 'inner', grid: { x: 0, y: 0, w: 24, h: 9 } })],
      })
    );
  });

  it('sends the content of markdown panels and flags the ones whose text changed', async () => {
    const arrangeLayout = jest.fn(async () => ({
      plan: '',
      panels: [{ id: 'p1', x: 0, y: 0, w: 48, h: 6 }],
      sections: [],
    }));
    const createMarkdownPanel = (content: string): AttachmentPanel => ({
      type: MARKDOWN_EMBEDDABLE_TYPE,
      id: 'intro',
      config: { content },
      grid: { x: 0, y: 0, w: 48, h: 4 },
    });

    await arrangeDashboardLayout({
      originalPanels: [createMarkdownPanel('Short')],
      dashboardData: { title: 'Dashboard', panels: [createMarkdownPanel('Longer text')] },
      arrangeLayout,
      logger,
    });

    const [[{ panels }]] = arrangeLayout.mock.calls as unknown as [[LayoutRequest]];
    expect(panels[0]).toEqual(
      expect.objectContaining({
        content: 'Longer text',
        grid: { x: 0, y: 0, w: 48, h: 4 },
        textChanged: true,
      })
    );
  });

  it.each<[string, LayoutArrangement, string]>([
    [
      'misses a panel',
      { ...completeArrangement, panels: [completeArrangement.panels[0]] },
      'panel "new-panel" is missing from its container',
    ],
    [
      'places a panel in another container',
      {
        ...completeArrangement,
        panels: [completeArrangement.panels[1]],
        sections: [{ id: 's1', y: 18, panels: [{ id: 'p1', x: 0, y: 0, w: 48, h: 9 }] }],
      },
      'panel "existing" is missing from its container',
    ],
    [
      'returns an unknown id',
      {
        ...completeArrangement,
        panels: [completeArrangement.panels[0], { ...completeArrangement.panels[1], id: 'p9' }],
      },
      'panel "new-panel" is missing from its container',
    ],
    [
      'misses a section',
      { ...completeArrangement, sections: [] },
      'section "section-a" is missing',
    ],
    [
      'repeats a panel',
      {
        ...completeArrangement,
        panels: [...completeArrangement.panels, { id: 'p1', x: 0, y: 30, w: 48, h: 9 }],
      },
      'a panel is repeated in its container',
    ],
    [
      'puts a section on the row of a top-level panel',
      {
        ...completeArrangement,
        sections: [{ ...completeArrangement.sections[0], y: 12 }],
      },
      'section "section-a" shares a row with another section or panel',
    ],
    [
      'overflows the grid',
      {
        ...completeArrangement,
        panels: completeArrangement.panels.map((panel) =>
          panel.id === 'p3' ? { ...panel, x: 24, w: 48 } : panel
        ),
      },
      'panel "new-panel" overflows the 48-column grid',
    ],
  ])('keeps the current layout when the arrangement %s', async (_, arrangement, issue) => {
    const result = await arrange(async () => arrangement);

    expect(result.dashboardData).toBe(dashboardWithNewPanel);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(issue));
    expect(result.failure).toBeUndefined();
  });

  it('keeps the current layout when the layout call fails', async () => {
    const result = await arrange(async () => {
      throw new Error('Model unavailable');
    });

    expect(result.dashboardData).toBe(dashboardWithNewPanel);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Model unavailable'));
    expect(result.failure).toBeUndefined();
  });

  it('skips the layout call for a dashboard without panels', async () => {
    const arrangeLayout = jest.fn();
    const dashboardData: DashboardAttachmentData = { title: 'Dashboard', panels: [] };

    const result = await arrange(arrangeLayout, {
      dashboardData,
      instructions: 'make the table full width',
    });

    expect(arrangeLayout).not.toHaveBeenCalled();
    expect(result.dashboardData).toBe(dashboardData);
    expect(result.failure).toBeUndefined();
  });

  it('reports a failure when a layout request is not applied', async () => {
    const result = await arrange(async () => ({ ...completeArrangement, sections: [] }), {
      instructions: 'make the new panel full width',
    });

    expect(result.dashboardData).toBe(dashboardWithNewPanel);
    expect(result.failure).toEqual({
      type: DASHBOARD_FAILURE_TYPES.layout,
      kind: 'dashboard',
      identifier: 'layout',
      error: expect.stringContaining('section "section-a" is missing'),
    });
  });
});
