/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentRequestV2 } from '../../../../common/types/api';
import { AttachmentType } from '../../../../common/types/domain';
import type { AttachmentService } from '../../../services';
import { MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES } from '../../../../common/constants';
import { isLegacyAttachmentRequest } from '../../../../common/utils/attachments';
import {
  isCommentRequestTypeActions,
  isFileAttachmentRequest,
  isPersistableStateOrExternalReference,
  isUnifiedPersistableStateOrExternalReference,
} from '../../utils';
import { BaseLimiter } from '../base_limiter';

export class PersistableStateAndExternalReferencesLimiter extends BaseLimiter {
  /**
   * @param isUnifiedAttachmentsEnabled `xpack.cases.attachments.enabled`: legacy `actions`
   * requests are only stored as counted `security.endpoint` rows when it is on.
   */
  constructor(
    private readonly attachmentService: AttachmentService,
    private readonly isUnifiedAttachmentsEnabled: boolean
  ) {
    super({
      limit: MAX_PERSISTABLE_STATE_AND_EXTERNAL_REFERENCES,
      attachmentType: [AttachmentType.persistableState, AttachmentType.externalReference],
      attachmentNoun: 'persistable state and external reference attachments',
    });
  }

  public async countOfItemsWithinCase(caseId: string): Promise<number> {
    return this.attachmentService.countPersistableStateAndExternalReferenceAttachments({
      caseId,
    });
  }

  public countOfItemsInRequest(requests: AttachmentRequestV2[]): number {
    return requests.filter((request) =>
      isLegacyAttachmentRequest(request)
        ? (isPersistableStateOrExternalReference(request) && !isFileAttachmentRequest(request)) ||
          (this.isUnifiedAttachmentsEnabled && isCommentRequestTypeActions(request))
        : isUnifiedPersistableStateOrExternalReference(request)
    ).length;
  }
}
