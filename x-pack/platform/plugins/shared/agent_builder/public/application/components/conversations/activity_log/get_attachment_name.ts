/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAttachmentEvent, type ActivityEvent } from '@kbn/agent-builder-common';
import {
  getVersion,
  toAttachment,
  type UnknownAttachment,
  type VersionedAttachment,
} from '@kbn/agent-builder-common/attachments';

interface GetAttachmentNameParams {
  event: ActivityEvent;
  attachments?: VersionedAttachment[];
  getLabel: (attachment: UnknownAttachment) => string | undefined;
}

export const getAttachmentName = ({
  event,
  attachments,
  getLabel,
}: GetAttachmentNameParams): string | undefined => {
  if (!isAttachmentEvent(event)) {
    return undefined;
  }

  const { attachment_id: attachmentId, attachment_type: attachmentType } = event.data;
  const eventDescription = 'description' in event.data ? event.data.description : undefined;
  const attachment = attachments?.find(({ id }) => id === attachmentId);

  const eventVersion = 'current_version' in event.data ? event.data.current_version : undefined;
  const versionData =
    attachment && getVersion(attachment, eventVersion ?? attachment.current_version);
  const label =
    attachment && versionData ? getLabel(toAttachment(attachment, versionData)) : undefined;

  return label || eventDescription || attachment?.description || attachmentType;
};
