/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import type {
  ImageAttachmentData,
  VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';

/**
 * Resolves the image attachment a tool result references via `image_attachment_id`
 * (e.g. a screenshot captured by a browser tool). Returns undefined when the step has no
 * image reference or the attachment is not (yet) available client-side.
 */
export const findResultImageAttachment = (
  step: ToolCallStepData,
  conversationAttachments: VersionedAttachment[] | undefined
): ImageAttachmentData | undefined => {
  if (!conversationAttachments) {
    return undefined;
  }
  for (const result of step.results) {
    const data = result.data as Record<string, unknown> | undefined;
    const imageAttachmentId = data?.image_attachment_id;
    if (typeof imageAttachmentId !== 'string') {
      continue;
    }
    const attachment = conversationAttachments.find(
      ({ id, type }) => id === imageAttachmentId && type === AttachmentType.image
    );
    if (attachment) {
      const latestVersion = getLatestVersion(attachment);
      if (latestVersion) {
        return latestVersion.data as ImageAttachmentData;
      }
    }
  }
  return undefined;
};

/**
 * Inline preview of an image a tool produced (shown under the tool call step).
 */
export const ToolResultImage: React.FC<{ image: ImageAttachmentData }> = ({ image }) => (
  <img
    src={image.content}
    alt={image.filename ?? 'Tool result image'}
    data-test-subj="agentBuilderToolResultImage"
    css={css`
      max-width: 100%;
      max-height: 300px;
      width: fit-content;
      border-radius: 6px;
      display: block;
    `}
  />
);
