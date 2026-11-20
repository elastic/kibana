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

  it('formats the pointer with the ids the agent needs to edit and copy the panel', async () => {
    const text = await formatPointer(pointerData);

    expect(text).toContain(`panel "CPU usage" (panelId: "panel-1", type: ${LENS_EMBEDDABLE_TYPE})`);
    expect(text).toContain('dashboard attachment "dashboard-attachment-1"');
    expect(text).toContain(dashboardTools.generateDashboard);
    expect(text).toContain('dashboardId: "dashboard-attachment-1"');
    expect(text).toContain(
      '`panels: [{ id: "panel-1", content: { type: "vis", query: <the change> } }]`'
    );
    expect(text).toContain('do not read the dashboard attachment first');
    expect(text).toContain(dashboardTools.pointedPanel);
    expect(text).toContain('panel_attachment_id: "pointer-1"` and `action: "read"');
    expect(text).toContain('panel_attachment_id: "pointer-1"` and `action: "show"');
    expect(text).toContain('type: "attachment", attachment_id: "pointer-1"');
  });

  it('scopes the message to the panel for both questions and changes', async () => {
    const text = await formatPointer(pointerData);

    expect(text).toContain('That message is about this panel');
    expect(text).toContain('answer a question about the panel or its data');
    expect(text).toContain('Change it (load the dashboards skill first)');
    expect(text).toContain('Later messages are about this panel only when');
    expect(text).not.toContain('This is a custom panel');
  });

  it('explains how to fill a custom panel through a panel request', async () => {
    const text = await formatPointer({ ...pointerData, panel_type: 'custom_content' });

    expect(text).toContain('This is a custom panel');
    expect(text).toContain('content: { type: "custom_content", query: <the change> }');
    expect(text).toContain('one or more ES|QL queries');
    expect(text).toContain('custom content guidance');
  });

  it('omits the label from the text when the panel has none', async () => {
    const text = await formatPointer({ ...pointerData, label: '' });

    expect(text).toContain('referring to the panel (panelId: "panel-1"');
    expect(text).not.toContain('""');
  });

  it('routes questions to a read and changes through the dashboard', () => {
    const description = createDashboardPanelAttachmentType().getAgentDescription?.() ?? '';

    expect(description).toContain('A question about the panel or its data');
    expect(description).toContain('Do not change the dashboard');
    expect(description).toContain(dashboardTools.generateDashboard);
    expect(description).toContain('edit the panel in place by its panel id');
    expect(description).toContain('A pointer from an earlier message does not make later messages');
    expect(description).toContain('Never create a new visualization attachment');
  });
});
