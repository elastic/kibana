/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import objectHash from 'object-hash';
import type {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
} from '@kbn/core/server';
import type {
  AttachmentLink,
  AttachmentDocument,
  AttachmentType,
  Attachment,
  DashboardSOAttributes,
  SloSOAttributes,
} from './types';
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

const processDashboardResults = (
  savedObjects: Array<SavedObject<DashboardSOAttributes>>
): Attachment[] => {
  return savedObjects
    .filter((savedObject) => !savedObject.error)
    .map((savedObject) => ({
      id: savedObject.id,
      redirectId: savedObject.id,
      type: 'dashboard',
      title: savedObject.attributes.title,
      tags: savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id),
    }));
};

const processSloResults = (savedObjects: Array<SavedObject<SloSOAttributes>>): Attachment[] => {
  return savedObjects
    .filter((savedObject) => !savedObject.error)
    .map((savedObject) => ({
      id: savedObject.id,
      redirectId: savedObject.attributes.id,
      type: 'slo',
      title: savedObject.attributes.name,
      tags: savedObject.references.filter((ref) => ref.type === 'tag').map((ref) => ref.id),
    }));
};

/**
 * Fetches saved objects by IDs for dashboards and SLOs only.
 * Rules use the rule client instead.
 */
export const getSoByIds = async ({
  soClient,
  attachmentType,
  ids,
}: {
  soClient: SavedObjectsClientContract;
  attachmentType: Extract<AttachmentType, 'dashboard' | 'slo'>;
  ids: string[];
}): Promise<Attachment[]> => {
  if (attachmentType === 'dashboard') {
    const result = await soClient.bulkGet<DashboardSOAttributes>(
      ids.map((id) => ({ id, type: attachmentType }))
    );
    return processDashboardResults(result.saved_objects);
  } else if (attachmentType === 'slo') {
    const result = await soClient.bulkGet<SloSOAttributes>(
      ids.map((id) => ({ id, type: attachmentType }))
    );
    return processSloResults(result.saved_objects);
  } else {
    throw new Error(`Unsupported attachment type: ${attachmentType}`);
  }
};

/**
 * Searches for suggested saved objects for dashboards and SLOs only.
 * Rules use the rule client instead.
 */
export const getSuggestedSo = async ({
  soClient,
  attachmentType,
  query,
  tags,
  perPage,
}: {
  soClient: SavedObjectsClientContract;
  attachmentType: Extract<AttachmentType, 'dashboard' | 'slo'>;
  query: string;
  tags?: string[];
  perPage: number;
}): Promise<Attachment[]> => {
  const searchOptions: SavedObjectsFindOptions = {
    type: attachmentType,
    search: query,
    perPage,
    ...(tags
      ? {
          hasReferenceOperator: 'OR',
          hasReference: tags.map((tag) => ({ type: 'tag', id: tag })),
        }
      : {}),
  };

  if (attachmentType === 'dashboard') {
    const result = await soClient.find<DashboardSOAttributes>(searchOptions);
    return processDashboardResults(result.saved_objects);
  } else if (attachmentType === 'slo') {
    const result = await soClient.find<SloSOAttributes>(searchOptions);
    return processSloResults(result.saved_objects);
  } else {
    throw new Error(`Unsupported attachment type: ${attachmentType}`);
  }
};
