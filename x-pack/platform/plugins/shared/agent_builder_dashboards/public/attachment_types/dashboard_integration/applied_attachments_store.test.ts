/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import { createAppliedAttachmentsStore } from './applied_attachments_store';

const createDashboardApi = (savedObjectId?: string) =>
  ({ savedObjectId$: new BehaviorSubject(savedObjectId) } as unknown as DashboardApi);

const createDeferred = () => {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('createAppliedAttachmentsStore', () => {
  describe('queueApply', () => {
    it('drops an apply still queued when the conversation changes', async () => {
      const store = createAppliedAttachmentsStore();
      store.setActiveConversationId('conversation-a');
      const firstApply = createDeferred();
      const secondApply = jest.fn().mockResolvedValue(undefined);

      const first = store.queueApply(() => firstApply.promise);
      const second = store.queueApply(secondApply);
      store.setActiveConversationId('conversation-b');
      firstApply.resolve();
      await Promise.all([first, second]);

      expect(secondApply).not.toHaveBeenCalled();
      expect(store.isApplying()).toBe(false);
    });

    it('keeps a queued apply when a new conversation gets its id', async () => {
      const store = createAppliedAttachmentsStore();
      const firstApply = createDeferred();
      const secondApply = jest.fn().mockResolvedValue(undefined);

      const first = store.queueApply(() => firstApply.promise);
      const second = store.queueApply(secondApply);
      store.setActiveConversationId('new-conversation');
      firstApply.resolve();
      await Promise.all([first, second]);

      expect(secondApply).toHaveBeenCalledTimes(1);
    });
  });

  describe('linkNextDashboard', () => {
    it('links the unsaved dashboard that opens next', () => {
      const store = createAppliedAttachmentsStore();
      store.setActiveConversationId('conversation-a');
      const previewedFrom = createDashboardApi();
      const opened = createDashboardApi();

      store.linkNextDashboard(previewedFrom, 'attachment-1');
      store.claimNextDashboardLink(previewedFrom);
      store.claimNextDashboardLink(opened);

      expect(store.getLinkedAttachmentId(previewedFrom)).toBeUndefined();
      expect(store.getLinkedAttachmentId(opened)).toBe('attachment-1');
    });

    it('is claimed once', () => {
      const store = createAppliedAttachmentsStore();
      store.setActiveConversationId('conversation-a');
      const opened = createDashboardApi();
      const openedLater = createDashboardApi();

      store.linkNextDashboard(createDashboardApi(), 'attachment-1');
      store.claimNextDashboardLink(opened);
      store.claimNextDashboardLink(openedLater);

      expect(store.getLinkedAttachmentId(openedLater)).toBeUndefined();
    });

    it.each([
      ['a saved dashboard opens', 'dashboard-1', 'conversation-a'],
      ['the conversation changed', undefined, 'conversation-b'],
    ])('does not link when %s', (_, savedObjectId, conversationId) => {
      const store = createAppliedAttachmentsStore();
      store.setActiveConversationId('conversation-a');
      const opened = createDashboardApi(savedObjectId);

      store.linkNextDashboard(createDashboardApi(), 'attachment-1');
      store.setActiveConversationId(conversationId);
      store.claimNextDashboardLink(opened);

      expect(store.getLinkedAttachmentId(opened)).toBeUndefined();
    });
  });
});
