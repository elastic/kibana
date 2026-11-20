/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DASHBOARD_ATTACHMENT_TYPE,
  type DashboardAttachment,
} from '@kbn/agent-builder-dashboards-common';
import { isOpenDashboardUpdate } from './reconcile';

const buildAttachment = (origin?: string): DashboardAttachment => ({
  id: 'attachment-1',
  type: DASHBOARD_ATTACHMENT_TYPE,
  origin,
  data: { title: 'Agent dashboard', panels: [] },
});

describe('isOpenDashboardUpdate', () => {
  it.each([
    ['the linked saved dashboard', 'dashboard-1', 'dashboard-1', ['attachment-1'], true],
    ['an unsaved dashboard', undefined, undefined, ['attachment-1'], true],
    [
      'the saved dashboard that staged an attachment without an origin',
      'managed-dashboard',
      undefined,
      ['attachment-1'],
      true,
    ],
    ['not a different saved dashboard', 'dashboard-1', 'other-dashboard', ['attachment-1'], false],
    [
      'not a saved dashboard that did not stage an attachment without an origin',
      'managed-dashboard',
      undefined,
      [],
      false,
    ],
  ])('belongs to %s', (_, dashboardId, origin, stagedAttachmentIds, expected) => {
    expect(
      isOpenDashboardUpdate({
        attachment: buildAttachment(origin),
        dashboardId,
        isStagedFromDashboard: (attachmentId) => stagedAttachmentIds.includes(attachmentId),
      })
    ).toBe(expected);
  });
});
