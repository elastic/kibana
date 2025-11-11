/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { SavedObject } from '@kbn/core/server';
import type { AttachmentLink, AttachmentDocument, AttachmentType, Attachment } from './types';
import { ATTACHMENT_ID, ATTACHMENT_TYPE, ATTACHMENT_UUID, STREAM_NAMES } from './storage_settings';

export function getAttachmentLinkUuid(attachment: AttachmentLink): string {
  return objectHash({
    [ATTACHMENT_ID]: attachment.id,
    [ATTACHMENT_TYPE]: attachment.type,
  });
}

export const getAttachmentDocument = (attachment: {
  id: string;
  type: AttachmentType;
  streamNames: string[];
  uuid: string;
}): AttachmentDocument => {
  return {
    [ATTACHMENT_ID]: attachment.id,
    [ATTACHMENT_TYPE]: attachment.type,
    [ATTACHMENT_UUID]: attachment.uuid,
    [STREAM_NAMES]: attachment.streamNames,
  };
};

export const soToAttachment = (
  savedObject: SavedObject<{ title: string }>,
  attachmentType: AttachmentType
): Attachment => {
  return {
    id: savedObject.id,
    type: attachmentType,
    title: savedObject.attributes.title,
    tags: savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id),
  };
};
