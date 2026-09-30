/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  getDashboardPanelAttachmentId,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { DashboardOperation } from './core/operations/registry';
import { refreshDashboardPanelPointers } from './panel_pointers';

const pointerId = getDashboardPanelAttachmentId('panel-1');

const pointerRecord = ({
  label = 'Old title',
  active,
}: { label?: string; active?: boolean } = {}) => ({
  id: pointerId,
  type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  current_version: 1,
  active,
  versions: [
    {
      version: 1,
      data: {
        dashboard_attachment_id: 'dashboard-attachment-1',
        panel_id: 'panel-1',
        label,
        panel_type: LENS_EMBEDDABLE_TYPE,
      },
    },
  ],
});

const dashboardData = (title?: string): DashboardAttachmentData => ({
  title: 'Dashboard',
  panels: [
    {
      type: LENS_EMBEDDABLE_TYPE,
      id: 'panel-1',
      grid: { x: 0, y: 0, w: 24, h: 15 },
      config: title === undefined ? { type: 'metric' } : { type: 'metric', title },
    },
  ],
});

const editPanels = (panelId = 'panel-1'): DashboardOperation =>
  ({
    operation: 'edit_panels',
    panels: [{ panelId, source: 'config', type: 'markdown', config: { content: 'x' } }],
  } as DashboardOperation);

const createAttachments = (records: Record<string, unknown>) => {
  const update = jest.fn().mockResolvedValue(undefined);
  const attachments = {
    getAttachmentRecord: jest.fn((id: string) => records[id]),
    update,
  } as unknown as AttachmentStateManager;
  return { attachments, update };
};

const logger = { warn: jest.fn() } as unknown as Logger;

describe('refreshDashboardPanelPointers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('refreshes the pointer label after an edited panel changes title', async () => {
    const { attachments, update } = createAttachments({ [pointerId]: pointerRecord() });

    await refreshDashboardPanelPointers({
      attachments,
      operations: [editPanels()],
      dashboardData: dashboardData('New title'),
      logger,
    });

    expect(update).toHaveBeenCalledWith(
      pointerId,
      { data: expect.objectContaining({ panel_id: 'panel-1', label: 'New title' }) },
      ATTACHMENT_REF_ACTOR.agent
    );
  });

  it('does nothing when no edit_panels operation ran', async () => {
    const { attachments, update } = createAttachments({ [pointerId]: pointerRecord() });

    await refreshDashboardPanelPointers({
      attachments,
      operations: [{ operation: 'remove_panels', panelIds: ['panel-1'] } as DashboardOperation],
      dashboardData: dashboardData('New title'),
      logger,
    });

    expect(attachments.getAttachmentRecord).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    ['no pointer exists', {}, 'New title'],
    ['the pointer is inactive', { [pointerId]: pointerRecord({ active: false }) }, 'New title'],
    ['the label is unchanged', { [pointerId]: pointerRecord({ label: 'Same' }) }, 'Same'],
    ['the panel has no title', { [pointerId]: pointerRecord() }, undefined],
  ])('skips the update when %s', async (_case, records, title) => {
    const { attachments, update } = createAttachments(records);

    await refreshDashboardPanelPointers({
      attachments,
      operations: [editPanels()],
      dashboardData: dashboardData(title),
      logger,
    });

    expect(update).not.toHaveBeenCalled();
  });

  it('skips pointers whose panel is no longer on the dashboard', async () => {
    const { attachments, update } = createAttachments({ [pointerId]: pointerRecord() });

    await refreshDashboardPanelPointers({
      attachments,
      operations: [editPanels()],
      dashboardData: { title: 'Dashboard', panels: [] },
      logger,
    });

    expect(update).not.toHaveBeenCalled();
  });

  it('warns instead of throwing when the update fails', async () => {
    const { attachments, update } = createAttachments({ [pointerId]: pointerRecord() });
    update.mockRejectedValue(new Error('boom'));

    await expect(
      refreshDashboardPanelPointers({
        attachments,
        operations: [editPanels()],
        dashboardData: dashboardData('New title'),
        logger,
      })
    ).resolves.toBeUndefined();

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining(pointerId));
  });
});
