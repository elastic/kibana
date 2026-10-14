/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LensAttachmentPayloadSchema,
  LensSavedObjectAttachmentPayloadSchema,
} from '../../../common/types/domain_zod/attachment/lens/v2';
import type { UnifiedAttachmentTypeSetup } from '../types';
import { LENS_ATTACHMENT_TYPE } from '../../../common/constants/attachments';

export const lensAttachmentType: UnifiedAttachmentTypeSetup = {
  id: LENS_ATTACHMENT_TYPE,
  schema: LensAttachmentPayloadSchema,
  // Workflow authors reference a lens visualization by SO id; the by-value
  // `data.state` arm and the optional `data` snapshot are embeddable bags they
  // can't hand-author, so only expose the by-reference shape.
  workflowSchema: LensSavedObjectAttachmentPayloadSchema.omit({ data: true }),
};
