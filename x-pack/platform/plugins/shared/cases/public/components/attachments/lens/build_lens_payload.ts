/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { LENS_ATTACHMENT_TYPE, LENS_SO_TYPE } from '../../../../common/constants/attachments';
import type {
  LensSavedObjectAttachmentData,
  LensSavedObjectAttachmentPayload,
  LensSavedObjectAttributes,
} from '../../../../common/types/domain_zod/attachment/lens/v2';
import { fitsSnapshotBudget } from '../common/saved_object/helpers';

export type LensPayload = Omit<LensSavedObjectAttachmentPayload, 'owner'>;

interface LensContentManagementGetResult {
  item?: {
    attributes?: LensSavedObjectAttributes;
    references?: Array<{ type: string; id: string; name: string }>;
  };
}

// Lens does not persist a view time range on the SO by design — the surrounding
// context (dashboard panel, embeddable consumer, etc.) owns it. We mirror the
// existing "Add to existing case" Lens embeddable action, which snapshots the
// live `lensApi.timeRange$` at action time, by capturing the global timefilter
// at attach time and storing it on the attachment payload.
const fetchLensAttributes = async ({
  id,
  contentManagement,
  timeRange,
}: {
  id: string;
  contentManagement: ContentManagementPublicStart;
  timeRange?: TimeRange;
}): Promise<LensSavedObjectAttachmentData | undefined> => {
  try {
    const result = (await contentManagement.client.get({
      contentTypeId: LENS_SO_TYPE,
      id,
    })) as LensContentManagementGetResult | undefined;
    const attributes = result?.item?.attributes ?? undefined;
    if (!attributes) {
      return undefined;
    }

    const references = result?.item?.references ?? [];
    const attributesSnapshot = references.length > 0 ? { ...attributes, references } : attributes;
    const snapshot = {
      attributes: attributesSnapshot,
      ...(timeRange ? { timeRange } : {}),
    };
    return fitsSnapshotBudget(snapshot) ? snapshot : undefined;
  } catch {
    return undefined;
  }
};

export const buildLensPayload = async ({
  id,
  title,
  contentManagement,
  timeRange,
}: {
  id: string;
  title: string;
  contentManagement: ContentManagementPublicStart;
  timeRange?: TimeRange;
}): Promise<LensPayload> => {
  const data = await fetchLensAttributes({ id, contentManagement, timeRange });
  return {
    type: LENS_ATTACHMENT_TYPE,
    attachmentId: id,
    metadata: { title, soType: LENS_SO_TYPE },
    ...(data ? { data } : {}),
  };
};
