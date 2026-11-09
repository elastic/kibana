/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AttachmentType, ExternalReferenceStorageType } from '../../../../common/types/domain';
import type { AttachmentUIV2 } from '../../../../common/ui/types';
import { elasticUser } from '../../../containers/mock';

export const makeFileComment = (
  id: string,
  attachmentId: string | string[],
  owner: string
): AttachmentUIV2 =>
  ({
    type: AttachmentType.externalReference,
    id,
    externalReferenceId: 'ext',
    externalReferenceStorage: { type: ExternalReferenceStorageType.elasticSearchDoc },
    externalReferenceAttachmentTypeId: '.files',
    externalReferenceMetadata: { files: [] },
    attachmentId,
    createdAt: '2024-01-01T00:00:00.000Z',
    createdBy: elasticUser,
    owner,
    pushedAt: null,
    pushedBy: null,
    updatedAt: null,
    updatedBy: null,
    version: 'v',
  } as unknown as AttachmentUIV2);
