/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentFormatContext } from '@kbn/agent-builder-server/attachments';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  type DashboardPanelAttachment,
  type DashboardPanelAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { dashboardTools } from '../../common';
import { createDashboardPanelAttachmentType } from './dashboard_panel';

const pointerData: DashboardPanelAttachmentData = {
  dashboard_attachment_id: 'dashboard-attachment-1',
  panel_id: 'panel-1',
  label: 'CPU usage',
  panel_type: 'lens',
};

const formatContext = { request: {}, spaceId: 'default' } as unknown as AttachmentFormatContext;

const formatPointer = async (data: DashboardPanelAttachmentData): Promise<string> => {
  const definition = createDashboardPanelAttachmentType();
  const attachment: DashboardPanelAttachment = {
    id: 'platform.dashboard.panel-panel-1',
    type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
    data,
  };
  const formatted = await definition.format(attachment, formatContext);
  const representation = await formatted.getRepresentation();
  if (representation.type !== 'text') {
    throw new Error(`Expected a text representation, got ${representation.type}`);
  }
  return representation.value;
};

describe('createDashboardPanelAttachmentType', () => {
  it('is a read-only type with no tools', () => {
    const definition = createDashboardPanelAttachmentType();

    expect(definition.id).toBe(DASHBOARD_PANEL_ATTACHMENT_TYPE);
    expect(definition.isReadonly).toBe(true);
    expect(definition.getTools?.()).toEqual([]);
  });

  it('validates pointer data against the schema', async () => {
    const definition = createDashboardPanelAttachmentType();

    expect(await definition.validate(pointerData)).toEqual({ valid: true, data: pointerData });
    expect(await definition.validate({ panel_id: 'panel-1' })).toMatchObject({ valid: false });
  });

  it('formats the pointer with the ids the agent needs to edit and copy the panel', async () => {
    const text = await formatPointer(pointerData);

    expect(text).toContain('panel "CPU usage" (panelId: "panel-1", type: lens)');
    expect(text).toContain('dashboard attachment "dashboard-attachment-1"');
    expect(text).toContain(dashboardTools.generateDashboard);
    expect(text).toContain('`edit_panels` operation with `panelId: "panel-1"`');
    expect(text).toContain('`source: "attachment"`');
  });

  it('omits the label from the text when the panel has none', async () => {
    const text = await formatPointer({ ...pointerData, label: '' });

    expect(text).toContain('referring to the panel (panelId: "panel-1"');
    expect(text).not.toContain('""');
  });

  it('describes the pointer as a reference that must be edited through the dashboard', () => {
    const description = createDashboardPanelAttachmentType().getAgentDescription?.() ?? '';

    expect(description).toContain(dashboardTools.generateDashboard);
    expect(description).toContain('`edit_panels`');
    expect(description).toContain('Never create a new visualization attachment');
  });
});
