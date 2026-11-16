/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ObservableAttachmentPayloadSchema } from '../../../common/types/domain/attachment/observable/v2';
import { OBSERVABLE_ATTACHMENT_TYPE } from '../../../common/constants/attachments';
import type { UnifiedAttachmentTypeSetup } from '../types';

/**
 * Case observables, one attachment each. The generic attachment routes refuse this type;
 * observables are written only by the observables client, which derives ids and enforces the cap.
 */
export const observableAttachmentType: UnifiedAttachmentTypeSetup = {
  id: OBSERVABLE_ATTACHMENT_TYPE,
  schema: ObservableAttachmentPayloadSchema,
  workflowSchema: false,
};
