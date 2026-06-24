/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { MAP_ATTACHMENT_TYPE, MAP_SO_TYPE } from '../../../../common/constants';
import type {
  MapAttributesSnapshot,
  MapAttachmentPayload,
} from '../../../../common/types/domain_zod/attachment/map/v2';
import { fitsSnapshotBudget } from '../common/saved_object/helpers';

export type MapPayload = Omit<MapAttachmentPayload, 'owner'>;

const fetchMapAttributes = async (
  contentManagement: ContentManagementPublicStart,
  id: string
): Promise<MapAttributesSnapshot | undefined> => {
  try {
    const result = (await contentManagement.client.get({
      contentTypeId: MAP_SO_TYPE,
      id,
    })) as { item?: { attributes?: MapAttributesSnapshot } } | undefined;
    const attributes = result?.item?.attributes ?? undefined;
    return attributes && fitsSnapshotBudget(attributes) ? attributes : undefined;
  } catch {
    return undefined;
  }
};

export const buildMapPayload = async ({
  contentManagement,
  id,
  title,
}: {
  contentManagement: ContentManagementPublicStart;
  id: string;
  title: string;
}): Promise<MapPayload> => {
  const attributes = await fetchMapAttributes(contentManagement, id);
  return {
    type: MAP_ATTACHMENT_TYPE,
    attachmentId: id,
    metadata: { title, soType: MAP_SO_TYPE },
    ...(attributes ? { data: { attributes } } : {}),
  };
};
