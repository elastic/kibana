/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useQueryClient } from '@kbn/react-query';
import { AttachmentType, MAX_PDF_BYTES } from '@kbn/agent-builder-common/attachments';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';
import { useConversation } from '../../../hooks/use_conversation';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useOpenNewConversation } from '../../../hooks/use_submit_message';
import { useToasts } from '../../../hooks/use_toasts';
import { queryKeys } from '../../../query_keys';
import { uploadPdfFile } from './upload_image';

export interface PdfReadingJob {
  key: string;
  conversationId: string;
  name: string;
  /** Resolves to the attachment id, or undefined when the add failed. */
  promise: Promise<string | undefined>;
  cancelled: boolean;
}

// POC: module-level store. The input remounts when a new conversation is opened
// (new_conversation_prompt -> conversation), so the "Reading PDF..." state can't live in the component.
let jobs: PdfReadingJob[] = [];
const listeners = new Set<() => void>();
const setJobs = (next: PdfReadingJob[]) => {
  jobs = next;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getJobs = () => jobs;

/**
 * A pdf attachment is "not sent yet" when it was added after the last round started.
 */
const isAddedAfterLastRound = (
  attachment: VersionedAttachment,
  lastRoundStartedAt: string | undefined
) => {
  const addedAt = attachment.versions[0]?.created_at;
  return !lastRoundStartedAt || (addedAt !== undefined && addedAt > lastRoundStartedAt);
};

/**
 * POC: PDF upload at paste time. Creates the conversation if needed, uploads the PDF,
 * and adds it to the conversation (OCR runs on the server before the route returns).
 */
export const usePdfAttachments = () => {
  const { attachmentsService, pdfFilesClient } = useAgentBuilderServices();
  const queryClient = useQueryClient();
  const conversationId = useConversationId();
  const { conversation } = useConversation();
  const openNewConversation = useOpenNewConversation();
  const { addErrorToast } = useToasts();
  const allJobs = useSyncExternalStore(subscribe, getJobs);

  const readingJobs = useMemo(
    () => allJobs.filter((job) => job.conversationId === conversationId && !job.cancelled),
    [allJobs, conversationId]
  );

  const pendingPdfs = useMemo(() => {
    const rounds = conversation?.rounds ?? [];
    const lastRoundStartedAt = rounds[rounds.length - 1]?.started_at;
    return (conversation?.attachments ?? []).filter(
      (attachment) =>
        attachment.type === AttachmentType.pdf &&
        attachment.active !== false &&
        isAddedAfterLastRound(attachment, lastRoundStartedAt)
    );
  }, [conversation]);

  const refreshConversation = useCallback(
    (id: string) => queryClient.invalidateQueries({ queryKey: queryKeys.conversations.byId(id) }),
    [queryClient]
  );

  const removePdf = useCallback(
    async (targetConversationId: string, attachmentId: string) => {
      try {
        await attachmentsService.delete({
          conversationId: targetConversationId,
          attachmentId,
          permanent: true,
        });
      } catch (error) {
        addErrorToast({ title: formatAgentBuilderErrorMessage(error) });
      }
      await refreshConversation(targetConversationId);
    },
    [attachmentsService, addErrorToast, refreshConversation]
  );

  /** Remove while OCR is still running: wait for the add to return, then delete. */
  const cancelReading = useCallback(
    async (job: PdfReadingJob) => {
      setJobs(jobs.map((item) => (item === job ? { ...item, cancelled: true } : item)));
      const attachmentId = await job.promise;
      if (attachmentId) {
        await removePdf(job.conversationId, attachmentId);
      }
    },
    [removePdf]
  );

  const addPdf = useCallback(
    async (file: File) => {
      if (!pdfFilesClient) return;
      // POC: no toast for a PDF that is too big
      if (file.size > MAX_PDF_BYTES) return;

      const targetConversationId = conversationId ?? (await openNewConversation());
      if (!targetConversationId) return;

      // Replace: max 1 PDF per message. Delete the old one, then add the new one.
      // POC: an old PDF still being read is only cancelled, its delete runs when its add returns.
      jobs
        .filter((job) => job.conversationId === targetConversationId && !job.cancelled)
        .forEach((job) => cancelReading(job));
      await Promise.all(pendingPdfs.map(({ id }) => removePdf(targetConversationId, id)));

      const name = file.name || 'document.pdf';
      const key = `${targetConversationId}:${name}:${Date.now()}`;
      const promise = (async () => {
        try {
          const fileId = await uploadPdfFile({ file, name, filesClient: pdfFilesClient });
          const attachment = await attachmentsService.create({
            conversationId: targetConversationId,
            type: AttachmentType.pdf,
            origin: fileId,
            render_inline: true,
          });
          return attachment.id;
        } catch (error) {
          // POC: the server error message is shown as is (OCR errors, too many pages, timeout)
          addErrorToast({ title: formatAgentBuilderErrorMessage(error) });
          return undefined;
        }
      })();
      const job: PdfReadingJob = {
        key,
        conversationId: targetConversationId,
        name,
        promise,
        cancelled: false,
      };
      setJobs([...jobs, job]);

      await promise;
      // read `jobs` again: the job can be cancelled while OCR runs
      const finished = jobs.find((item) => item.key === key);
      setJobs(jobs.filter((item) => item.key !== key));
      if (!finished?.cancelled) {
        await refreshConversation(targetConversationId);
      }
    },
    [
      pdfFilesClient,
      conversationId,
      openNewConversation,
      cancelReading,
      pendingPdfs,
      removePdf,
      attachmentsService,
      addErrorToast,
      refreshConversation,
    ]
  );

  return {
    readingJobs,
    pendingPdfs,
    addPdf,
    removePdf: (attachmentId: string) =>
      conversationId ? removePdf(conversationId, attachmentId) : Promise.resolve(),
    cancelReading,
  };
};
