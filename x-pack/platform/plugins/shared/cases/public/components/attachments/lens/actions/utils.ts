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

/** By-value attachment: the Lens panel isn't backed by a library saved object. */
export const getLensByValueAttachment = ({
  timeRange,
  attributes,
  metadata,
}: {
  timeRange: LensProps['timeRange'];
  attributes: LensSavedObjectAttributes;
  metadata?: LensProps['metadata'];
}): Omit<UnifiedValueAttachmentPayload, 'owner'> =>
  ({
    type: LENS_ATTACHMENT_TYPE,
    data: {
      state: { attributes, timeRange, metadata },
    },
  } as unknown as Omit<UnifiedValueAttachmentPayload, 'owner'>);

/**
 * By-ref attachment: the Lens panel is backed by a library saved object, so
 * the case only stores a reference plus an optional size-bounded snapshot for
 * offline rendering. `metadata` is intentionally not a parameter here -- the
 * by-ref payload's metadata is always `{ title, soType }`, so there's nothing
 * for a caller to pass through.
 */
export const getLensByRefAttachment = ({
  timeRange,
  attributes,
  savedObjectId,
  title,
}: {
  timeRange: LensProps['timeRange'];
  attributes: LensSavedObjectAttributes;
  savedObjectId: string;
  title?: string;
}): Omit<UnifiedReferenceAttachmentPayload, 'owner'> => {
  const snapshot = { attributes, timeRange };
  return {
    type: LENS_ATTACHMENT_TYPE,
    attachmentId: savedObjectId,
    metadata: { title: getAttachmentTitle(attributes, title), soType: LENS_SO_TYPE },
    ...(fitsSnapshotBudget(snapshot) ? { data: snapshot } : {}),
  } as unknown as Omit<UnifiedReferenceAttachmentPayload, 'owner'>;
};
