/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getDashboardPanelAttachmentId,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { getPanelIds, getRelabelledPanelPointers, type PanelPointer } from './panel_pointer_labels';

const grid = { x: 0, y: 0, w: 24, h: 15 };

const dashboardAttachmentId = 'dashboard-attachment-1';

const createPointer = (
  panelId: string,
  label: string,
  pointerDashboardAttachmentId = dashboardAttachmentId
): PanelPointer => ({
  id: getDashboardPanelAttachmentId(panelId),
  data: {
    dashboard_attachment_id: pointerDashboardAttachmentId,
    panel_id: panelId,
    label,
    panel_type: LENS_EMBEDDABLE_TYPE,
  },
});

const createDashboardData = (panels: unknown[]): DashboardAttachmentData =>
  ({ title: 'Dashboard', panels } as unknown as DashboardAttachmentData);

const lensPanel = (id: string, title?: string) => ({
  type: LENS_EMBEDDABLE_TYPE,
  id,
  grid,
  config: title === undefined ? { type: 'metric' } : { type: 'metric', title },
});

const section = (panels: unknown[]) => ({
  id: 'section-1',
  title: 'Section',
  collapsed: false,
  grid: { y: 0 },
  panels,
});

describe('getRelabelledPanelPointers', () => {
  it('relabels a pointer whose panel was renamed', () => {
    expect(
      getRelabelledPanelPointers({
        dashboardAttachmentId,
        dashboardData: createDashboardData([lensPanel('panel-1', 'New title')]),
        pointers: [createPointer('panel-1', 'Old title')],
      })
    ).toEqual([createPointer('panel-1', 'New title')]);
  });

  it('derives the label of an untitled metric panel from its primary metric', () => {
    expect(
      getRelabelledPanelPointers({
        dashboardAttachmentId,
        dashboardData: createDashboardData([
          {
            type: LENS_EMBEDDABLE_TYPE,
            id: 'panel-1',
            grid,
            config: { type: 'metric', metrics: [{ type: 'primary', column: 'Errors' }] },
          },
        ]),
        pointers: [createPointer('panel-1', '')],
      })
    ).toEqual([createPointer('panel-1', 'Errors')]);
  });

  it('finds panels inside sections', () => {
    expect(
      getRelabelledPanelPointers({
        dashboardAttachmentId,
        dashboardData: createDashboardData([section([lensPanel('panel-1', 'Renamed')])]),
        pointers: [createPointer('panel-1', 'Old title')],
      })
    ).toEqual([createPointer('panel-1', 'Renamed')]);
  });

  it.each([
    ['the label is unchanged', [lensPanel('panel-1', 'Same')], [createPointer('panel-1', 'Same')]],
    ['the panel has no title', [lensPanel('panel-1')], [createPointer('panel-1', 'Old title')]],
    ['the panel was removed', [], [createPointer('panel-1', 'Old title')]],
    ['there are no pointers', [lensPanel('panel-1', 'New title')], []],
    [
      'the pointer names another dashboard',
      [lensPanel('panel-1', 'New title')],
      [createPointer('panel-1', 'Old title', 'other-dashboard')],
    ],
  ])('returns nothing when %s', (_case, panels, pointers) => {
    expect(
      getRelabelledPanelPointers({
        dashboardAttachmentId,
        dashboardData: createDashboardData(panels),
        pointers,
      })
    ).toEqual([]);
  });

  it('returns nothing when the dashboard is not linked to an attachment', () => {
    expect(
      getRelabelledPanelPointers({
        dashboardAttachmentId: undefined,
        dashboardData: createDashboardData([lensPanel('panel-1', 'New title')]),
        pointers: [createPointer('panel-1', 'Old title')],
      })
    ).toEqual([]);
  });
});

describe('getPanelIds', () => {
  it('returns the ids of top-level panels and panels inside sections', () => {
    expect(
      getPanelIds(createDashboardData([lensPanel('panel-1'), section([lensPanel('panel-2')])]))
    ).toEqual(['panel-1', 'panel-2']);
  });
});
