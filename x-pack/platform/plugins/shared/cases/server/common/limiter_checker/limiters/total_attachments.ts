/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequestV2 } from '../../../../common/types/api';
import type { AttachmentService } from '../../../services';
import { MAX_ATTACHMENTS_PER_CASE } from '../../../../common/constants';
import { BaseLimiter } from '../base_limiter';

/**
 * Caps the number of attachments on a case across every type. Each request creates 1 attachment.
 */
export class TotalAttachmentsLimiter extends BaseLimiter {
  constructor(private readonly attachmentService: AttachmentService) {
    super({ limit: MAX_ATTACHMENTS_PER_CASE, attachmentNoun: 'items' });
  }

  public async countOfItemsWithinCase(caseId: string): Promise<number> {
    return this.attachmentService.countAttachments({ caseId });
  }

  public countOfItemsInRequest(requests: AttachmentRequestV2[]): number {
    return requests.length;
  }
}
