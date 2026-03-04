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
import { isFileAttachmentRequest, isPersistableStateOrExternalReference } from '../../utils';
import { BaseLimiter } from '../base_limiter';

export class PersistableStateAndExternalReferencesLimiter extends BaseLimiter {
  constructor(private readonly attachmentService: AttachmentService) {
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
    const legacyRequests = requests.filter(isLegacyAttachmentRequest);
    const totalReferences = legacyRequests
      .filter(isPersistableStateOrExternalReference)
      .filter((request) => !isFileAttachmentRequest(request));

    return totalReferences.length;
  }
}
