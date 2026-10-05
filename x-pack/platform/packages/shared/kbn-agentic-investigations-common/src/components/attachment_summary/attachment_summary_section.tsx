/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { DetailsBlock } from '../details/detail_block';
import { AttachmentSummaryList } from './attachment_summary_list';
import { selectSummaryAttachments } from './select_summary_attachments';
import { SUMMARY_ATTACHMENT_TYPES, type SummaryAttachmentType } from './summary_attachment_types';
import { ATTACHMENT_SUMMARY_TITLE } from './translations';

export interface AttachmentSummarySectionProps {
  /** The conversation's attachments, unfiltered. */
  attachments: VersionedAttachment[] | undefined;
  attachmentsService: AttachmentServiceStartContract;
  title?: string;
  /** The kinds this summary lists, in order. Defaults to {@link SUMMARY_ATTACHMENT_TYPES}. */
  attachmentTypes?: readonly SummaryAttachmentType[];
}

/**
 * Titled section listing the attachments an investigation is built from. Renders nothing when no
 * attachment matches a category, so an empty summary never takes up space in the flyout.
 */
export const AttachmentSummarySection = memo<AttachmentSummarySectionProps>(
  ({
    attachments,
    attachmentsService,
    title = ATTACHMENT_SUMMARY_TITLE,
    attachmentTypes = SUMMARY_ATTACHMENT_TYPES,
  }) => {
    const summaryAttachments = useMemo(
      () => selectSummaryAttachments(attachments, attachmentTypes),
      [attachments, attachmentTypes]
    );

    const renderableAttachments = useMemo(
      () =>
        summaryAttachments.filter((a) =>
          Boolean(
            attachmentsService.getAttachmentUiDefinition(a.type)?.renderConversationDetailsContent
          )
        ),
      [summaryAttachments, attachmentsService]
    );

    if (renderableAttachments.length === 0) {
      return null;
    }

    return (
      <DetailsBlock title={title}>
        <AttachmentSummaryList
          attachments={summaryAttachments}
          attachmentsService={attachmentsService}
        />
      </DetailsBlock>
    );
  }
);

AttachmentSummarySection.displayName = 'AttachmentSummarySection';
