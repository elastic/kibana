/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getDashboardPanelAttachmentId,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { syncPanelPointerLabels, type DashboardPanelPointer } from './panel_pointer_labels';

const grid = { x: 0, y: 0, w: 24, h: 15 };

const createPointer = (panelId: string, label: string): DashboardPanelPointer => ({
  id: getDashboardPanelAttachmentId(panelId),
  type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  current_version: 1,
  versions: [
    {
      version: 1,
      created_at: new Date().toISOString(),
      content_hash: 'hash',
      data: {
        dashboard_attachment_id: 'dashboard-attachment-1',
        panel_id: panelId,
        label,
        panel_type: LENS_EMBEDDABLE_TYPE,
      },
    },
  ],
});

const createApi = (panels: unknown[]): DashboardApi =>
  ({
    getSerializedState: () => ({ attributes: { title: 'Dashboard', panels } }),
  } as unknown as DashboardApi);

const lensPanel = (id: string, title?: string) => ({
  type: LENS_EMBEDDABLE_TYPE,
  id,
  grid,
  config: title === undefined ? { type: 'metric' } : { type: 'metric', title },
});

describe('syncPanelPointerLabels', () => {
  let addAttachment: jest.Mock;

  beforeEach(() => {
    addAttachment = jest.fn();
  });

  it('re-adds a pointer whose panel was renamed', () => {
    syncPanelPointerLabels({
      agentBuilder: { addAttachment },
      api: createApi([lensPanel('panel-1', 'New title')]),
      pointers: [createPointer('panel-1', 'Old title')],
    });

    expect(addAttachment).toHaveBeenCalledTimes(1);
    expect(addAttachment).toHaveBeenCalledWith({
      id: getDashboardPanelAttachmentId('panel-1'),
      type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
      data: expect.objectContaining({ panel_id: 'panel-1', label: 'New title' }),
    });
  });

  it('derives the label of an untitled metric panel from its primary metric', () => {
    syncPanelPointerLabels({
      agentBuilder: { addAttachment },
      api: createApi([
        {
          type: LENS_EMBEDDABLE_TYPE,
          id: 'panel-1',
          grid,
          config: { type: 'metric', metrics: [{ type: 'primary', column: 'Errors' }] },
        },
      ]),
      pointers: [createPointer('panel-1', '')],
    });

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ label: 'Errors' }) })
    );
  });

  it('finds panels inside sections', () => {
    syncPanelPointerLabels({
      agentBuilder: { addAttachment },
      api: createApi([
        {
          id: 'section-1',
          title: 'Section',
          collapsed: false,
          grid: { y: 0 },
          panels: [lensPanel('panel-1', 'Renamed in section')],
        },
      ]),
      pointers: [createPointer('panel-1', 'Old title')],
    });

    expect(addAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ label: 'Renamed in section' }),
      })
    );
  });

  it.each([
    ['the label is unchanged', [lensPanel('panel-1', 'Same')], [createPointer('panel-1', 'Same')]],
    ['the panel has no title', [lensPanel('panel-1')], [createPointer('panel-1', 'Old title')]],
    ['the panel was removed', [], [createPointer('panel-1', 'Old title')]],
    ['there are no pointers', [lensPanel('panel-1', 'New title')], []],
  ])('does nothing when %s', (_case, panels, pointers) => {
    syncPanelPointerLabels({ agentBuilder: { addAttachment }, api: createApi(panels), pointers });

    expect(addAttachment).not.toHaveBeenCalled();
  });

  it('does not read the dashboard when no pointers are known', () => {
    const getSerializedState = jest.fn();

    syncPanelPointerLabels({
      agentBuilder: { addAttachment },
      api: { getSerializedState } as unknown as DashboardApi,
      pointers: undefined,
    });

    expect(getSerializedState).not.toHaveBeenCalled();
  });
});
