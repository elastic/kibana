/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DASHBOARD_ATTACHMENT_TYPE, DASHBOARD_PANEL_ATTACHMENT_TYPE } from './constants';
import {
  DASHBOARD_PANEL_LABEL_MAX_LENGTH,
  dashboardPanelAttachmentDataSchema,
  getDashboardPanelAttachmentId,
  isDashboardPanelAttachment,
} from './dashboard_panel_attachment';

const validData = {
  dashboard_attachment_id: 'dashboard-attachment-1',
  panel_id: 'panel-1',
  label: 'CPU usage',
  panel_type: 'lens',
  editable: true,
};

describe('dashboardPanelAttachmentDataSchema', () => {
  it.each<[string, Record<string, string>, boolean]>([
    ['a complete pointer', {}, true],
    ['an empty label', { label: '' }, true],
    ['an empty dashboard_attachment_id', { dashboard_attachment_id: '' }, false],
    ['an empty panel_id', { panel_id: '' }, false],
    ['an empty panel_type', { panel_type: '' }, false],
    [
      'a label above the length bound',
      { label: 'x'.repeat(DASHBOARD_PANEL_LABEL_MAX_LENGTH + 1) },
      false,
    ],
  ])('validates %s', (_, overrides, expected) => {
    expect(
      dashboardPanelAttachmentDataSchema.safeParse({ ...validData, ...overrides }).success
    ).toBe(expected);
  });
});

describe('getDashboardPanelAttachmentId', () => {
  it('derives an id from the dashboard attachment and panel ids, distinct per dashboard copy', () => {
    const id = getDashboardPanelAttachmentId({
      dashboardAttachmentId: 'dashboard-1',
      panelId: 'panel-1',
    });
    expect(id).toMatch(new RegExp(`^${DASHBOARD_PANEL_ATTACHMENT_TYPE}-[0-9a-z]+$`));
    expect(
      getDashboardPanelAttachmentId({ dashboardAttachmentId: 'dashboard-2', panelId: 'panel-1' })
    ).not.toBe(id);
  });
});

describe('isDashboardPanelAttachment', () => {
  const attachment = (type: string): VersionedAttachment =>
    ({ id: 'a', type, versions: [], current_version: 1 } as unknown as VersionedAttachment);

  it('matches the pointer type only', () => {
    expect(isDashboardPanelAttachment(attachment(DASHBOARD_PANEL_ATTACHMENT_TYPE))).toBe(true);
    expect(isDashboardPanelAttachment(attachment(DASHBOARD_ATTACHMENT_TYPE))).toBe(false);
  });
});
