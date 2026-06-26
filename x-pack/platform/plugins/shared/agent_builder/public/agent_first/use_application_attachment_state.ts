/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type {
  UseApplicationAttachmentStateOptions,
  UseApplicationAttachmentStateResult,
} from '@kbn/agent-builder-browser';
import {
  getActiveConversationSnapshot,
  getAttachmentLinkStateSnapshot,
  getPendingAttachmentsSnapshot,
  scrollToInlineAttachmentFromBridge,
  subscribeAttachmentLinkState,
} from './attachment_link_bridge';
import { attachWithFlightFromBridge } from './attachment_coordinator/coordinator_bridge';
import { evaluateAttachmentLink } from './evaluate_attachment_link';

export const useApplicationAttachmentState = ({
  getAttachment,
  linkDescriptor,
  iconType,
}: UseApplicationAttachmentStateOptions): UseApplicationAttachmentStateResult => {
  const attachmentInput = getAttachment();
  const canAttach = attachmentInput !== null;

  useSyncExternalStore(
    subscribeAttachmentLinkState,
    getAttachmentLinkStateSnapshot,
    getAttachmentLinkStateSnapshot
  );

  const linkEvaluation = useMemo(
    () =>
      evaluateAttachmentLink({
        attachmentInput,
        linkDescriptor,
        pendingAttachments: getPendingAttachmentsSnapshot(),
        activeConversation: getActiveConversationSnapshot(),
      }),
    [attachmentInput, linkDescriptor]
  );

  const { isLinked, linkedAttachmentId, conversationTitle } = linkEvaluation;

  const attach = useCallback(
    async (sourceElement: HTMLElement | null) => {
      if (isLinked && linkedAttachmentId) {
        scrollToInlineAttachmentFromBridge(linkedAttachmentId);
        return;
      }

      const nextAttachment = getAttachment();

      if (!nextAttachment) {
        return;
      }

      await attachWithFlightFromBridge(nextAttachment, {
        sourceElement,
        iconType,
      });
    },
    [getAttachment, iconType, isLinked, linkedAttachmentId]
  );

  return useMemo(
    () => ({
      canAttach,
      isLinked,
      conversationTitle,
      attach,
    }),
    [attach, canAttach, conversationTitle, isLinked]
  );
};
