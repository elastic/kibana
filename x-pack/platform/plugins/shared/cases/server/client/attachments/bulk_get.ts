/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition } from 'lodash';
import type {
  BulkGetAttachmentsResponse,
  BulkGetAttachmentsResponseV2,
} from '../../../common/types/api';
import {
  BulkGetAttachmentsRequestRt,
  BulkGetAttachmentsResponseRt,
  BulkGetAttachmentsResponseRtV2,
} from '../../../common/types/api';
import type { AttachmentAttributes, AttachmentAttributesV2 } from '../../../common/types/domain';
import { flattenAttachmentSavedObjects } from '../../common/utils';
import { createCaseError, generateCaseErrorResponse } from '../../common/error';
import type { CasesClientArgs } from '../types';
import { Operations } from '../../authorization';
import type { BulkGetArgs } from './types';
import type { BulkOptionalAttributes, OptionalAttributes } from '../../services/attachments/types';
import type { CasesClient } from '../client';
import type { AttachmentSavedObject, SOWithErrors } from '../../common/types';
import { partitionByCaseAssociation } from '../../common/partitioning';
import { decodeOrThrow, decodeWithExcessOrThrow } from '../../common/runtime_types';

type AttachmentSavedObjectWithErrors = Array<SOWithErrors<AttachmentAttributes>>;

/**
 * Retrieves multiple attachments by id.
 */
export async function bulkGet(
  { savedObjectIds, caseID, mode = 'legacy' }: BulkGetArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<BulkGetAttachmentsResponseV2> {
  const {
    services: { attachmentService },
    logger,
    authorization,
  } = clientArgs;

  try {
    const request = decodeWithExcessOrThrow(BulkGetAttachmentsRequestRt)({ ids: savedObjectIds });

    // perform an authorization check for the case
    await casesClient.cases.resolve({ id: caseID });

    const attachments = await attachmentService.getter.bulkGet(request.ids, mode);

    const { validAttachments, attachmentsWithErrors, invalidAssociationAttachments } =
      partitionAttachments(caseID, attachments);

    const { authorized: authorizedAttachments, unauthorized: unauthorizedAttachments } =
      await authorization.getAndEnsureAuthorizedEntities({
        savedObjects: validAttachments,
        operation: Operations.bulkGetAttachments,
      });

    const errors = constructErrors({
      associationErrors: invalidAssociationAttachments,
      unauthorizedAttachments,
      soBulkGetErrors: attachmentsWithErrors,
      caseId: caseID,
    });

    const res = {
      attachments: flattenAttachmentSavedObjects(authorizedAttachments),
      errors,
    };
    if (mode === 'legacy') {
      return decodeOrThrow(BulkGetAttachmentsResponseRt)(res);
    }
    return decodeOrThrow(BulkGetAttachmentsResponseRtV2)(res);
  } catch (error) {
    throw createCaseError({
      message: `Failed to bulk get attachments for case id: ${caseID}: ${error}`,
      error,
      logger,
    });
  }
}

interface PartitionedAttachments {
  validAttachments: AttachmentSavedObject[];
  attachmentsWithErrors: AttachmentSavedObjectWithErrors;
  invalidAssociationAttachments: AttachmentSavedObject[];
}

const partitionAttachments = (
  caseId: string,
  attachments: BulkOptionalAttributes<AttachmentAttributesV2>
): PartitionedAttachments => {
  const [attachmentsWithoutErrors, errors] = partitionBySOError(attachments.saved_objects);
  const [caseAttachments, invalidAssociationAttachments] = partitionByCaseAssociation(
    caseId,
    attachmentsWithoutErrors
  );

  return {
    validAttachments: caseAttachments,
    attachmentsWithErrors: errors,
    invalidAssociationAttachments,
  };
};

const partitionBySOError = (attachments: Array<OptionalAttributes<AttachmentAttributesV2>>) =>
  partition(
    attachments,
    (attachment) => attachment.error == null && attachment.attributes != null
  ) as [AttachmentSavedObject[], AttachmentSavedObjectWithErrors];

const constructErrors = ({
  caseId,
  soBulkGetErrors,
  associationErrors,
  unauthorizedAttachments,
}: {
  caseId: string;
  soBulkGetErrors: AttachmentSavedObjectWithErrors;
  associationErrors: AttachmentSavedObject[];
  unauthorizedAttachments: AttachmentSavedObject[];
}): BulkGetAttachmentsResponse['errors'] => {
  const errors: BulkGetAttachmentsResponse['errors'] = [];

  for (const soError of soBulkGetErrors) {
    errors.push({ ...generateCaseErrorResponse(soError.error), savedObjectId: soError.id });
  }

  for (const attachment of associationErrors) {
    errors.push({
      error: 'Bad Request',
      message: `Attachment is not attached to case id=${caseId}`,
      status: 400,
      savedObjectId: attachment.id,
    });
  }

  for (const unauthorizedAttachment of unauthorizedAttachments) {
    errors.push({
      error: 'Forbidden',
      message: `Unauthorized to access attachment with owner: "${unauthorizedAttachment.attributes.owner}"`,
      status: 403,
      savedObjectId: unauthorizedAttachment.id,
    });
  }

  return errors;
};
