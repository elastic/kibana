/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { LENS_ATTACHMENT_TYPE } from '../../../../../common/constants/attachments';
import type { UnifiedValueAttachmentPayload } from '../../../../../common/types/domain';
import type { LensProps } from '../types';

type UnifiedValueAttachmentWithoutOwner = Omit<UnifiedValueAttachmentPayload, 'owner'>;

export const getLensCaseAttachment = ({
  timeRange,
  attributes,
  metadata,
}: {
  timeRange: LensProps['timeRange'];
  attributes: LensSavedObjectAttributes;
  metadata?: LensProps['metadata'];
}): UnifiedValueAttachmentWithoutOwner =>
  ({
    type: LENS_ATTACHMENT_TYPE,
    data: {
      state: { attributes, timeRange, metadata },
    },
  } as unknown as UnifiedValueAttachmentWithoutOwner);
