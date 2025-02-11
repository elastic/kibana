/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { LensSavedObjectAttributes } from '@kbn/lens-plugin/public';
import { LENS_ATTACHMENT_TYPE } from '../../../../common/constants/visualizations';
import type { PersistableStateAttachmentPayload } from '../../../../common/types/domain';
import { AttachmentType } from '../../../../common/types/domain';
import type { LensProps } from '../types';

type PersistableStateAttachmentWithoutOwner = Omit<PersistableStateAttachmentPayload, 'owner'>;

export const getLensCaseAttachment = ({
  timeRange,
  attributes,
  metadata,
}: {
  timeRange: LensProps['timeRange'];
  attributes: LensSavedObjectAttributes;
  metadata?: LensProps['metadata'];
}): PersistableStateAttachmentWithoutOwner =>
  ({
    persistableStateAttachmentState: { attributes, timeRange, metadata },
    persistableStateAttachmentTypeId: LENS_ATTACHMENT_TYPE,
    type: AttachmentType.persistableState,
  } as unknown as PersistableStateAttachmentWithoutOwner);
