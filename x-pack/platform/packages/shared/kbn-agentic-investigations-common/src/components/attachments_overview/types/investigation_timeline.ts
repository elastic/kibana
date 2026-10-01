/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { getLatestVersion, type VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { getVisibleAttachments } from './url_utils';

const TYPE_INVESTIGATION_TIMELINE = 'security.investigation.timeline';

/** Renders one visible investigation timeline attachment through its details renderer. */
export const getInvestigationTimelineDetailRows = (
  attachments: readonly VersionedAttachment[],
  getAttachmentUiDefinition: AttachmentServiceStartContract['getAttachmentUiDefinition']
): { key: string; content: ReactNode } | undefined => {
  const attachment = getVisibleAttachments(attachments).find(
    (item) => item.type === TYPE_INVESTIGATION_TIMELINE
  );
  if (!attachment) return;

  const latestVersion = getLatestVersion(attachment);
  const render = getAttachmentUiDefinition(attachment.type)?.renderConversationDetailsContent;
  if (!latestVersion || !render) return;

  const content = render({
    attachment: {
      id: attachment.id,
      type: attachment.type,
      data: latestVersion.data as Record<string, unknown>,
      description: attachment.description,
      origin: attachment.origin,
    },
  });

  if (content == null || content === false) return;

  return { key: attachment.id, content };
};
