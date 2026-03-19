/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsUtils } from '@kbn/core/server';

import type { AttachmentRequestV2, ObservablePost } from '../../../common/types/api';
import { BulkCreateAttachmentsRequestRtV2 } from '../../../common/types/api/attachment/v2';
import type { Case } from '../../../common/types/domain';
import { decodeWithExcessOrThrow } from '../../common/runtime_types';

import { CaseCommentModel } from '../../common/models';
import { createCaseError } from '../../common/error';
import type { CasesClient } from '../client';
import type { CasesClientArgs } from '..';

import { decodeCommentRequestV2 } from '../utils';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import type { BulkCreateArgs } from './types';
import { validateRegisteredAttachments } from './validators';
import { validateMaxUserActions } from '../../common/validators';

function getReferenceAttachmentInfo(
  attachment: AttachmentRequestV2
): { type: string; attachmentId: string; metadata?: Record<string, unknown> } | null {
  if (!('attachmentId' in attachment) || attachment.attachmentId == null) {
    return null;
  }
  const attachmentId = attachment.attachmentId;
  if (typeof attachmentId !== 'string' || !attachmentId) {
    return null;
  }
  const metadata =
    attachment.metadata && typeof attachment.metadata === 'object'
      ? (attachment.metadata as Record<string, unknown>)
      : undefined;
  return { type: attachment.type, attachmentId, metadata };
}

export const bulkCreate = async (
  args: BulkCreateArgs,
  clientArgs: CasesClientArgs,
  casesClient: CasesClient
): Promise<Case> => {
  const { attachments, caseId, mode = 'legacy' } = args;

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
        return [
          [...a, { id: savedObjectID, ...attachment }],
          [...e, { owner: attachment.owner, id: savedObjectID }],
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
    });

    const referenceAttachments = attachmentsWithIds
      .map(getReferenceAttachmentInfo)
      .filter(
        (
          info
        ): info is { type: string; attachmentId: string; metadata?: Record<string, unknown> } =>
          info != null
      );
    if (referenceAttachments.length > 0) {
      try {
        const allObservables: ObservablePost[] = [];
        for (const { type, attachmentId, metadata } of referenceAttachments) {
          const attachmentType = unifiedAttachmentTypeRegistry.get(type);
          const getObservables = attachmentType?.getObservables;
          if (getObservables) {
            const observables = await getObservables({
              esClient: clientArgs.esClient,
              attachmentId,
              metadata,
            });
            allObservables.push(...observables);
          }
        }
        if (allObservables.length > 0) {
          await casesClient.cases.bulkAddObservables({
            caseId,
            observables: allObservables,
          });
        }
      } catch (observablesError) {
        logger.warn(
          `Failed to add observables from attachments to case ${caseId}: ${observablesError}`
        );
      }
    }

    return await updatedModel.encodeWithComments({ mode });
  } catch (error) {
    throw createCaseError({
      message: `Failed while bulk creating attachment to case id: ${caseId} error: ${error}`,
      error,
      logger,
    });
  }
};
