/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
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

const soToAttachment = (
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

export const getSoByIds = async ({
  soClient,
  attachmentType,
  ids,
}: {
  soClient: SavedObjectsClientContract;
  attachmentType: AttachmentType;
  ids: string[];
}): Promise<Attachment[]> => {
  const result = await soClient.bulkGet<{ title: string }>(
    ids.map((id) => ({ id, type: attachmentType }))
  );
  return result.saved_objects
    .filter((savedObject) => !savedObject.error)
    .map((savedObject) => soToAttachment(savedObject, attachmentType));
};

export const getSuggestedSo = async ({
  soClient,
  attachmentType,
  query,
  tags,
  perPage,
}: {
  soClient: SavedObjectsClientContract;
  attachmentType: AttachmentType;
  query: string;
  tags?: string[];
  perPage: number;
}): Promise<Attachment[]> => {
  const result = await soClient.find<{ title: string }>({
    type: attachmentType,
    search: query,
    perPage,
    ...(tags
      ? {
          hasReferenceOperator: 'OR',
          hasReference: tags.map((tag) => ({ type: 'tag', id: tag })),
        }
      : {}),
  });
  return result.saved_objects
    .filter((savedObject) => !savedObject.error)
    .map((savedObject) => soToAttachment(savedObject, attachmentType));
};
