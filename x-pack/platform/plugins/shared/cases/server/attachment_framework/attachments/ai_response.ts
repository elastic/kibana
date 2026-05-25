/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AiResponseAttachmentPayloadSchema,
  AI_RESPONSE_ATTACHMENT_TYPE,
} from '../../../common/types/domain_zod/attachment/ai_response/v1';
import type { UnifiedAttachmentTypeSetup } from '../types';

export const aiResponseAttachmentType: UnifiedAttachmentTypeSetup = {
  id: AI_RESPONSE_ATTACHMENT_TYPE,
  schema: AiResponseAttachmentPayloadSchema,
};
