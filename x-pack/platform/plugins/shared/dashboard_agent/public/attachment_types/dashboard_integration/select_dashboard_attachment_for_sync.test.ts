/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachment } from '@kbn/dashboard-agent-common/types';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/dashboard-agent-common';
import { selectDashboardAttachmentForSync } from './select_dashboard_attachment_for_sync';

const createAttachment = ({
  id,
  origin,
}: {
  id: string;
  origin: string | undefined;
}): DashboardAttachment => ({
  id,
  origin,
  type: DASHBOARD_ATTACHMENT_TYPE,
  data: {
    title: `Dashboard ${id}`,
    description: '',
    panels: [],
  },
});

describe('selectDashboardAttachmentForSync', () => {
  it('selects the attachment linked to the current saved dashboard', () => {
    const selectedAttachment = selectDashboardAttachmentForSync({
      attachments: [
        createAttachment({ id: 'attachment-a', origin: 'dashboard-a' }),
        createAttachment({ id: 'attachment-b', origin: 'dashboard-b' }),
      ],
      currentSavedObjectId: 'dashboard-b',
    });

    expect(selectedAttachment?.id).toBe('attachment-b');
  });

  it('falls back to the only attachment for a saved dashboard when there is no matching origin', () => {
    const selectedAttachment = selectDashboardAttachmentForSync({
      attachments: [createAttachment({ id: 'attachment-a', origin: 'deleted-dashboard' })],
      currentSavedObjectId: 'current-dashboard',
    });

    expect(selectedAttachment?.id).toBe('attachment-a');
  });

  it('selects the first unlinked attachment when editing an unsaved dashboard', () => {
    const selectedAttachment = selectDashboardAttachmentForSync({
      attachments: [
        createAttachment({ id: 'attachment-a', origin: 'dashboard-a' }),
        createAttachment({ id: 'attachment-b', origin: undefined }),
        createAttachment({ id: 'attachment-c', origin: undefined }),
      ],
      currentSavedObjectId: undefined,
    });

    expect(selectedAttachment?.id).toBe('attachment-b');
  });

  it('falls back to the first attachment when editing an unsaved dashboard with no unlinked attachments', () => {
    const selectedAttachment = selectDashboardAttachmentForSync({
      attachments: [
        createAttachment({ id: 'attachment-a', origin: 'dashboard-a' }),
        createAttachment({ id: 'attachment-b', origin: 'dashboard-b' }),
      ],
      currentSavedObjectId: undefined,
    });

    expect(selectedAttachment?.id).toBe('attachment-a');
  });

  it('does not select any attachment when viewing a different saved dashboard', () => {
    const selectedAttachment = selectDashboardAttachmentForSync({
      attachments: [
        createAttachment({ id: 'attachment-a', origin: 'dashboard-a' }),
        createAttachment({ id: 'attachment-b', origin: undefined }),
      ],
      currentSavedObjectId: 'dashboard-c',
    });

    expect(selectedAttachment).toBeUndefined();
  });
});
