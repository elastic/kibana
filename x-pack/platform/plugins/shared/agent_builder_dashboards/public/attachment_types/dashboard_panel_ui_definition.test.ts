/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AttachmentUIDefinition } from '@kbn/agent-builder-browser/attachments';
import {
  DASHBOARD_PANEL_ATTACHMENT_TYPE,
  type DashboardPanelAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { CUSTOM_CONTENT_EMBEDDABLE_TYPE } from '@kbn/custom-content-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { registerDashboardPanelAttachmentUiDefinition } from './dashboard_panel_ui_definition';

const pointer = (label: string, panelType: string): DashboardPanelAttachment => ({
  id: 'platform.dashboard.panel-panel-1',
  type: DASHBOARD_PANEL_ATTACHMENT_TYPE,
  data: {
    dashboard_attachment_id: 'dashboard-attachment-1',
    panel_id: 'panel-1',
    label,
    panel_type: panelType,
  },
});

const registerDefinition = (): AttachmentUIDefinition<DashboardPanelAttachment> => {
  const addAttachmentType = jest.fn();
  registerDashboardPanelAttachmentUiDefinition({
    attachments: { addAttachmentType },
  } as unknown as AgentBuilderPluginStart);

  expect(addAttachmentType).toHaveBeenCalledWith(
    DASHBOARD_PANEL_ATTACHMENT_TYPE,
    expect.any(Object)
  );
  return addAttachmentType.mock.calls[0][1];
};

describe('registerDashboardPanelAttachmentUiDefinition', () => {
  it('labels the pill with the panel title', () => {
    expect(registerDefinition().getLabel(pointer('CPU usage', LENS_EMBEDDABLE_TYPE))).toBe(
      'CPU usage'
    );
  });

  it.each([
    [LENS_EMBEDDABLE_TYPE, 'Visualization'],
    [CUSTOM_CONTENT_EMBEDDABLE_TYPE, 'Custom panel'],
    ['markdown', 'Dashboard panel'],
  ])('falls back by panel type for %s', (panelType, expected) => {
    expect(registerDefinition().getLabel(pointer('', panelType))).toBe(expected);
  });

  it('renders as a pill only', () => {
    const definition = registerDefinition();

    expect(definition.getIcon?.()).toBe('visualizeApp');
    expect(definition.renderInlineContent).toBeUndefined();
    expect(definition.renderCanvasContent).toBeUndefined();
  });
});
