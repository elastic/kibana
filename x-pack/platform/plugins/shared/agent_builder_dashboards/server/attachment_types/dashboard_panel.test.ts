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
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { dashboardTools } from '../../common';
import { createDashboardPanelAttachmentType } from './dashboard_panel';

const pointerData: DashboardPanelAttachmentData = {
  dashboard_attachment_id: 'dashboard-attachment-1',
  panel_id: 'panel-1',
  label: 'CPU usage',
  panel_type: LENS_EMBEDDABLE_TYPE,
};

const POINTER_ID = 'pointer-1';

const formatContext = { request: {}, spaceId: 'default' } as unknown as AttachmentFormatContext;

const formatPointer = async (data: DashboardPanelAttachmentData): Promise<string> => {
  const definition = createDashboardPanelAttachmentType();
  const attachment: DashboardPanelAttachment = {
    id: POINTER_ID,
    type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
    data,
  };
  const formatted = await definition.format(attachment, formatContext);
  if (!formatted.getRepresentation) {
    throw new Error('Expected a representation getter');
  }
  const representation = await formatted.getRepresentation();
  if (representation.type !== 'text') {
    throw new Error(`Expected a text representation, got ${representation.type}`);
  }
  return representation.value;
};

describe('createDashboardPanelAttachmentType', () => {
  it('is a read-only type exposing the pointed panel tool', () => {
    const definition = createDashboardPanelAttachmentType();

    expect(definition.id).toBe(DASHBOARD_PANEL_ATTACHMENT_TYPE);
    expect(definition.isReadonly).toBe(true);
    expect(definition.getTools?.()).toEqual([dashboardTools.pointedPanel]);
  });

  it('validates pointer data against the schema', async () => {
    const definition = createDashboardPanelAttachmentType();

    expect(await definition.validate(pointerData)).toEqual({ valid: true, data: pointerData });
    expect(await definition.validate({ panel_id: 'panel-1' })).toMatchObject({ valid: false });
  });

  it('names the panel and the edit call for it', async () => {
    const text = await formatPointer(pointerData);

    expect(text).toContain(`panel "CPU usage" (panelId: "panel-1", type: ${LENS_EMBEDDABLE_TYPE})`);
    expect(text).toContain('dashboard attachment "dashboard-attachment-1"');
    expect(text).toContain(dashboardTools.generateDashboard);
    expect(text).toContain('dashboardId: "dashboard-attachment-1"');
    expect(text).toContain(
      '`panels: [{ id: "panel-1", content: { type: "vis", query: <the change> } }]`'
    );
  });

  it('uses the custom content type to edit a custom panel', async () => {
    const text = await formatPointer({ ...pointerData, panel_type: 'custom_content' });

    expect(text).toContain('content: { type: "custom_content", query: <the change> }');
  });

  it('omits the label from the text when the panel has none', async () => {
    const text = await formatPointer({ ...pointerData, label: '' });

    expect(text).toContain('Points at the panel (panelId: "panel-1"');
    expect(text).not.toContain('""');
  });

  it('routes questions to a read and changes through the dashboard', () => {
    const description = createDashboardPanelAttachmentType().getAgentDescription?.() ?? '';

    expect(description).toContain('A question about the panel or its data');
    expect(description).toContain('Do not change the dashboard');
    expect(description).toContain(dashboardTools.generateDashboard);
    expect(description).toContain('edit the panel in place through');
    expect(description).toContain('A pointer from an earlier message does not make later messages');
    expect(description).toContain('Never create a new visualization attachment');
  });

  it('tells the agent how to get the panel ids without reading the pointer', () => {
    const description = createDashboardPanelAttachmentType().getAgentDescription?.() ?? '';

    expect(description).toContain(
      `Pass its attachment id as \`panel_attachment_id\` to \`${dashboardTools.pointedPanel}\``
    );
    expect(description).toContain(
      "returns the panel's `dashboard_attachment_id`, id, type and config"
    );
    expect(description).not.toContain('its text gives');
  });
});
