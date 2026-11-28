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
import {
  FILE_ATTACHMENT_TYPE,
  PERSISTABLE_ATTACHMENT_TYPES,
  UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP,
} from '../../../../common/constants/attachments';
import {
  isLegacyAttachmentRequest,
  isUnifiedAttachmentRequest,
} from '../../../../common/utils/attachments';
import { isFileAttachmentRequest, isPersistableStateOrExternalReference } from '../../utils';
import { BaseLimiter } from '../base_limiter';

const UNIFIED_TYPES_TO_COUNT = new Set<string>([
  ...PERSISTABLE_ATTACHMENT_TYPES,
  ...Object.keys(UNIFIED_TO_EXTERNAL_REFERENCE_TYPE_MAP).filter(
    (type) => type !== FILE_ATTACHMENT_TYPE
  ),
]);

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
    const totalLegacyReferences = legacyRequests
      .filter(isPersistableStateOrExternalReference)
      .filter((request) => !isFileAttachmentRequest(request));

    const totalUnifiedReferences = requests
      .filter(isUnifiedAttachmentRequest)
      .filter((request) => UNIFIED_TYPES_TO_COUNT.has(request.type));

    return totalLegacyReferences.length + totalUnifiedReferences.length;
  }
}
