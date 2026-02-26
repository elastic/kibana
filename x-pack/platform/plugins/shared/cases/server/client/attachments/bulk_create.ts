/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import type { AttachmentRequestV2 } from '../../../common/types/api';
import { BulkCreateAttachmentsRequestRtV2 } from '../../../common/types/api/attachment/v2';
import type { Case } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';

import { decodeCommentRequestV2 } from '../utils';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import type { BulkCreateArgs } from './types';
import { validateRegisteredAttachments } from './validators';
import { validateMaxUserActions } from '../../common/validators';
import { getCaseOwner } from './utils';
import { isLegacyAttachmentRequest } from '../../../common/utils/attachments';

export const bulkCreate = async (
  args: BulkCreateArgs,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const { attachments, caseId } = args;

  const {
    logger,
    authorization,
    externalReferenceAttachmentTypeRegistry,
    persistableStateAttachmentTypeRegistry,
    unifiedAttachmentTypeRegistry,
    services: { userActionService },
  } = clientArgs;

  try {
    decodeWithExcessOrThrow(BulkCreateAttachmentsRequestRtV2)(attachments);
    await validateMaxUserActions({
      caseId,
      userActionService,
      userActionsToAdd: attachments.length,
    });
    const caseOwner = await getCaseOwner(caseId, clientArgs);

    attachments.forEach((attachment) => {
      decodeCommentRequestV2(
        attachment,
        externalReferenceAttachmentTypeRegistry,
        unifiedAttachmentTypeRegistry
      );
      validateRegisteredAttachments({
        query: attachment,
        persistableStateAttachmentTypeRegistry,
        externalReferenceAttachmentTypeRegistry,
        unifiedAttachmentTypeRegistry,
      });
    });

    const [attachmentsWithIds, entities]: [
      Array<{ id: string } & AttachmentRequestV2>,
      OwnerEntity[]
    ] = attachments.reduce<[Array<{ id: string } & AttachmentRequestV2>, OwnerEntity[]]>(
      ([a, e], attachment) => {
        const savedObjectID = SavedObjectsUtils.generateId();
        const owner = isLegacyAttachmentRequest(attachment) ? attachment.owner : caseOwner;
        return [
          [...a, { id: savedObjectID, ...attachment }],
          [...e, { owner, id: savedObjectID }],
        ];
      },
      [[], []]
    );

    await authorization.ensureAuthorized({
      operation: Operations.bulkCreateAttachments,
      entities,
    });

    const model = await CaseCommentModel.create(caseId, clientArgs);
    const updatedModel = await model.bulkCreate({
      attachments: attachmentsWithIds,
      owner: caseOwner,
    });

    return await updatedModel.encodeWithComments();
  } catch (error) {
    throw createCaseError({
      message: `Failed while bulk creating attachment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
