/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import { BulkCreateUnifiedAttachmentsRequestSchema } from '../../../common/types/api/attachment/v2';
import type { Case, UnifiedAttachment } from '../../../common/types/domain';
import type { UnifiedAttachmentPayload } from '../../../common/types/domain/attachment/v2';
import { decodeWithExcessOrThrowZod } from '../../common/runtime_types';
import { flattenAttachmentSavedObject } from '../../common/utils';
import { toUnifiedAttachment } from '../../services/attachments/operations/utils';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { CasesClientArgs } from '..';
import type { AttachmentSavedObjectTransformedV2 } from '../../common/types/attachments_v2';

import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import type { BulkCreateArgs } from './types';
import { validateUnifiedAttachments } from './validators';
import { validateMaxUserActions } from '../../common/validators';
import { emitAttachmentsAddedEvent } from './trigger_utils';
import { extractAndAddObservables } from './extract_observables';

const createAttachments = async (
  args: BulkCreateArgs,
  clientArgs: CasesClientArgs
): Promise<{
  model: CaseCommentModel;
  createdAttachments: AttachmentSavedObjectTransformedV2[];
}> => {
  const { attachments, caseId } = args;

  const {
    logger,
    authorization,
    unifiedAttachmentTypeRegistry,
    services: { userActionService },
  } = clientArgs;

  try {
    const decodedAttachments = decodeWithExcessOrThrowZod(
      BulkCreateUnifiedAttachmentsRequestSchema
    )(attachments);

    await validateMaxUserActions({
      caseId,
      userActionService,
      userActionsToAdd: decodedAttachments.length,
    });

    decodedAttachments.forEach((attachment) => {
      validateUnifiedAttachments({
        query: attachment,
        unifiedAttachmentTypeRegistry,
      });
    });

    const [attachmentsWithIds, entities]: [
      Array<{ id: string } & UnifiedAttachmentPayload>,
      OwnerEntity[]
    ] = decodedAttachments.reduce<
      [Array<{ id: string } & UnifiedAttachmentPayload>, OwnerEntity[]]
    >(
      ([a, e], attachment) => {
        const savedObjectID = SavedObjectsUtils.generateId();
        return [
          [...a, { id: savedObjectID, ...attachment }],
          [...e, { owner: attachment.owner, id: savedObjectID }],
        ];
      },
      [[], []]
    );

    if (entities.length > 0) {
      await authorization.ensureAuthorized({
        operation: Operations.bulkCreateAttachments,
        entities,
      });
    }

    const model = await CaseCommentModel.create(caseId, clientArgs);

    // An empty request has no attachment owners, so check the case owner instead.
    if (entities.length === 0) {
      await authorization.ensureAuthorized({
        operation: Operations.bulkCreateAttachments,
        entities: [{ owner: model.savedObject.attributes.owner, id: caseId }],
      });
    }

    const { model: updatedModel, attachments: createdAttachments } = await model.bulkCreate({
      attachments: attachmentsWithIds,
    });

    const {
      attributes: { owner, settings },
    } = model.savedObject;
    const caseInfo = { id: caseId, owner };

    const idsByType = new Map<string, string[]>();
    for (const attachment of attachmentsWithIds) {
      const ids = idsByType.get(attachment.type) ?? [];
      ids.push(attachment.id);
      idsByType.set(attachment.type, ids);
    }
    for (const [type, ids] of idsByType) {
      emitAttachmentsAddedEvent(clientArgs, caseInfo, ids, type);
    }

    // This call never throws — failures are logged and do not abort the attachment creation.
    await extractAndAddObservables(caseId, decodedAttachments, { settings }, clientArgs);

    return { model: updatedModel, createdAttachments };
  } catch (error) {
    throw createCaseError({
      message: `Failed while bulk creating attachment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};

/**
 * Create attachments to a case. Returns the created attachments.
 */
export const bulkCreate = async (
  args: BulkCreateArgs,
  clientArgs: CasesClientArgs
): Promise<UnifiedAttachment[]> => {
  const { createdAttachments } = await createAttachments(args, clientArgs);

  return createdAttachments.map((attachment) =>
    toUnifiedAttachment(flattenAttachmentSavedObject(attachment))
  );
};

/**
 * Create attachments to a case. Returns the case with all its attachments.
 */
export const bulkCreateAndGetCase = async (
  args: BulkCreateArgs,
  clientArgs: CasesClientArgs
): Promise<Case> => {
  const { model } = await createAttachments(args, clientArgs);

  return model.encodeWithComments();
};
