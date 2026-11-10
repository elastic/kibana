/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createNewDashboardLink } from './new_dashboard_link';

const buildDashboardApi = (savedObjectId?: string) =>
  ({ savedObjectId$: { getValue: () => savedObjectId } } as unknown as DashboardApi);

describe('createNewDashboardLink', () => {
  it('links the next unsaved dashboard that opens to the attachment', () => {
    const link = createNewDashboardLink();
    const newDashboardApi = buildDashboardApi();

    link.linkNextDashboard(buildDashboardApi('managed-dashboard'), 'attachment-1');
    link.claim(newDashboardApi);

    expect(link.getLinkedAttachmentId(newDashboardApi)).toBe('attachment-1');
  });

  it('keeps the link for the new dashboard when the dashboard the changes came from opens again', () => {
    const link = createNewDashboardLink();
    const managedDashboardApi = buildDashboardApi('managed-dashboard');
    const newDashboardApi = buildDashboardApi();

    link.linkNextDashboard(managedDashboardApi, 'attachment-1');
    link.claim(managedDashboardApi);
    link.claim(newDashboardApi);

    expect(link.getLinkedAttachmentId(managedDashboardApi)).toBeUndefined();
    expect(link.getLinkedAttachmentId(newDashboardApi)).toBe('attachment-1');
  });

  it('does not link a saved dashboard', () => {
    const link = createNewDashboardLink();
    const savedDashboardApi = buildDashboardApi('dashboard-2');

    link.linkNextDashboard(buildDashboardApi('managed-dashboard'), 'attachment-1');
    link.claim(savedDashboardApi);

    expect(link.getLinkedAttachmentId(savedDashboardApi)).toBeUndefined();
  });

  it('links only the first dashboard that opens', () => {
    const link = createNewDashboardLink();
    const laterDashboardApi = buildDashboardApi();

    link.linkNextDashboard(buildDashboardApi('managed-dashboard'), 'attachment-1');
    link.claim(buildDashboardApi());
    link.claim(laterDashboardApi);

    expect(link.getLinkedAttachmentId(laterDashboardApi)).toBeUndefined();
  });

  it('does not link the next dashboard once the link is removed', () => {
    const link = createNewDashboardLink();
    const newDashboardApi = buildDashboardApi();

    const unlink = link.linkNextDashboard(buildDashboardApi('managed-dashboard'), 'attachment-1');
    unlink();
    link.claim(newDashboardApi);

    expect(link.getLinkedAttachmentId(newDashboardApi)).toBeUndefined();
  });
});
