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
};

describe('dashboardPanelAttachmentDataSchema', () => {
  it('accepts a complete pointer', () => {
    expect(dashboardPanelAttachmentDataSchema.safeParse(validData).success).toBe(true);
  });

  it('accepts an empty label', () => {
    expect(dashboardPanelAttachmentDataSchema.safeParse({ ...validData, label: '' }).success).toBe(
      true
    );
  });

  it.each(['dashboard_attachment_id', 'panel_id', 'panel_type'])('rejects an empty %s', (field) => {
    expect(
      dashboardPanelAttachmentDataSchema.safeParse({ ...validData, [field]: '' }).success
    ).toBe(false);
  });

  it('rejects a label above the length bound', () => {
    expect(
      dashboardPanelAttachmentDataSchema.safeParse({
        ...validData,
        label: 'x'.repeat(DASHBOARD_PANEL_LABEL_MAX_LENGTH + 1),
      }).success
    ).toBe(false);
  });
});

describe('getDashboardPanelAttachmentId', () => {
  it('derives a deterministic id from the panel id', () => {
    expect(getDashboardPanelAttachmentId('panel-1')).toBe(
      `${DASHBOARD_PANEL_ATTACHMENT_TYPE}-panel-1`
    );
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
