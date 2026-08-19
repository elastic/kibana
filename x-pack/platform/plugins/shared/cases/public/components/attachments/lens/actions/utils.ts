/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LensApi, LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { LENS_ATTACHMENT_TYPE, LENS_SO_TYPE } from '../../../../../common/constants/attachments';
import type {
  UnifiedReferenceAttachmentPayload,
  UnifiedValueAttachmentPayload,
} from '../../../../../common/types/domain';
import { getNonEmptyField, isNonEmptyString } from '../../../../../common/utils/attachments';
import { fitsSnapshotBudget } from '../../common/saved_object/helpers';
import type { LensProps } from '../types';

type LensAttachmentWithoutOwner =
  | Omit<UnifiedValueAttachmentPayload, 'owner'>
  | Omit<UnifiedReferenceAttachmentPayload, 'owner'>;

/**
 * Library id for a Lens panel. `savedObjectId$` is sourced from `ref_id`;
 * serialize/legacy state are fallbacks for dashboard panels that still carry
 * the older `savedObjectId` field.
 */
export const getLensLibrarySavedObjectId = (lensApi: LensApi): string | undefined => {
  const fromPublishing = getNonEmptyField(lensApi.savedObjectId$?.getValue());
  if (fromPublishing) {
    return fromPublishing;
  }

  const serialized = lensApi.serializeState?.();
  if (serialized && typeof serialized === 'object') {
    const fromSerialized =
      getNonEmptyField('ref_id' in serialized ? serialized.ref_id : undefined) ??
      getNonEmptyField('savedObjectId' in serialized ? serialized.savedObjectId : undefined);
    if (fromSerialized) {
      return fromSerialized;
    }
  }

  const legacy = lensApi.getLegacySerializedState?.();
  if (legacy && typeof legacy === 'object') {
    return (
      getNonEmptyField('ref_id' in legacy ? legacy.ref_id : undefined) ??
      getNonEmptyField('savedObjectId' in legacy ? legacy.savedObjectId : undefined) ??
      undefined
    );
  }

  return undefined;
};

const getAttachmentTitle = (attributes: LensSavedObjectAttributes, title?: string): string => {
  if (isNonEmptyString(attributes.title)) {
    return attributes.title;
  }
  return title ?? '';
};

export const getLensCaseAttachment = ({
  timeRange,
  attributes,
  metadata,
  savedObjectId,
  title,
}: {
  timeRange: LensProps['timeRange'];
  attributes: LensSavedObjectAttributes;
  metadata?: LensProps['metadata'];
  savedObjectId?: string;
  title?: string;
}): LensAttachmentWithoutOwner => {
  if (savedObjectId) {
    const snapshot = { attributes, timeRange };
    return {
      type: LENS_ATTACHMENT_TYPE,
      attachmentId: savedObjectId,
      metadata: { title: getAttachmentTitle(attributes, title), soType: LENS_SO_TYPE },
      ...(fitsSnapshotBudget(snapshot) ? { data: snapshot } : {}),
    } as unknown as Omit<UnifiedReferenceAttachmentPayload, 'owner'>;
  }

  return {
    type: LENS_ATTACHMENT_TYPE,
    data: {
      state: { attributes, timeRange, metadata },
    },
  } as unknown as Omit<UnifiedValueAttachmentPayload, 'owner'>;
};
