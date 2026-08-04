/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { DASHBOARD_ATTACHMENT_TYPE } from '@kbn/agent-builder-dashboards-common';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import { persistDashboardAttachment } from './persist_dashboard_attachment';

const dashboardData = (title: string) => ({
  title,
  description: '',
  panels: [],
});

describe('persistDashboardAttachment', () => {
  const createManager = () =>
    createAttachmentStateManager([], {
      getTypeDefinition: () =>
        ({
          id: DASHBOARD_ATTACHMENT_TYPE,
          validate: (input: unknown) => ({ valid: true, data: input }),
        }) as any,
    });

  it('creates a hidden draft when persistAttachment is false', async () => {
    const attachments = createManager();

    const result = await persistDashboardAttachment({
      attachments,
      previousAttachmentId: undefined,
      dashboardData: dashboardData('Draft'),
      description: 'Dashboard: Draft',
      persistAttachment: false,
    });

    expect(result.persisted).toBe(false);
    expect(result.draftId).toBeDefined();
    const record = attachments.getAttachmentRecord(result.draftId!);
    expect(record?.hidden).toBe(true);
    expect(getLatestVersion(record!)?.data).toEqual(dashboardData('Draft'));
  });

  it('updates a hidden draft in place across iterations', async () => {
    const attachments = createManager();
    const first = await persistDashboardAttachment({
      attachments,
      previousAttachmentId: undefined,
      dashboardData: dashboardData('v1'),
      description: 'Dashboard: v1',
      persistAttachment: false,
    });

    const second = await persistDashboardAttachment({
      attachments,
      previousAttachmentId: first.draftId,
      dashboardData: dashboardData('v2'),
      description: 'Dashboard: v2',
      persistAttachment: false,
    });

    expect(second.draftId).toBe(first.draftId);
    expect(second.version).toBeGreaterThan(first.version);
    expect(attachments.getAttachmentRecord(first.draftId!)?.hidden).toBe(true);
  });

  it('publishes a single visible attachment when finalizing a new-dashboard draft', async () => {
    const attachments = createManager();
    const draft = await persistDashboardAttachment({
      attachments,
      previousAttachmentId: undefined,
      dashboardData: dashboardData('v1'),
      description: 'Dashboard: v1',
      persistAttachment: false,
    });
    await persistDashboardAttachment({
      attachments,
      previousAttachmentId: draft.draftId,
      dashboardData: dashboardData('v2'),
      description: 'Dashboard: v2',
      persistAttachment: false,
    });

    const published = await persistDashboardAttachment({
      attachments,
      previousAttachmentId: draft.draftId,
      dashboardData: dashboardData('final'),
      description: 'Dashboard: final',
      persistAttachment: true,
    });

    expect(published.persisted).toBe(true);
    expect(published.attachmentId).toBe(draft.draftId);
    const record = attachments.getAttachmentRecord(published.attachmentId);
    expect(record?.hidden).toBeFalsy();
    expect(record?.versions).toHaveLength(1);
    expect(record?.current_version).toBe(1);
    expect(getLatestVersion(record!)?.data).toEqual(dashboardData('final'));
  });

  it('forks a draft from a visible attachment and publishes back to the source on finalize', async () => {
    const attachments = createManager();
    const source = await attachments.add({
      id: 'existing-dashboard',
      type: DASHBOARD_ATTACHMENT_TYPE,
      description: 'Dashboard: existing',
      data: dashboardData('existing'),
    });

    const draft = await persistDashboardAttachment({
      attachments,
      previousAttachmentId: source.id,
      dashboardData: dashboardData('draft-1'),
      description: 'Dashboard: draft-1',
      persistAttachment: false,
    });

    expect(draft.draftId).not.toBe(source.id);
    expect(attachments.getAttachmentRecord(source.id)?.hidden).toBeFalsy();
    expect(getLatestVersion(attachments.getAttachmentRecord(source.id)!)?.data).toEqual(
      dashboardData('existing')
    );

    const published = await persistDashboardAttachment({
      attachments,
      previousAttachmentId: draft.draftId,
      dashboardData: dashboardData('published'),
      description: 'Dashboard: published',
      persistAttachment: true,
    });

    expect(published.attachmentId).toBe(source.id);
    expect(attachments.getAttachmentRecord(draft.draftId!)).toBeUndefined();
    expect(getLatestVersion(attachments.getAttachmentRecord(source.id)!)?.data).toEqual(
      dashboardData('published')
    );
  });

  it('one-shot persist creates a visible attachment immediately', async () => {
    const attachments = createManager();
    const result = await persistDashboardAttachment({
      attachments,
      previousAttachmentId: undefined,
      dashboardData: dashboardData('One shot'),
      description: 'Dashboard: One shot',
      persistAttachment: true,
    });

    expect(result.persisted).toBe(true);
    expect(attachments.getAttachmentRecord(result.attachmentId)?.hidden).toBeFalsy();
  });
});
