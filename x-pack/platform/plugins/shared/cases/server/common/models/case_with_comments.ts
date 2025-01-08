/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';

import type {
  SavedObject,
  SavedObjectReference,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import type {
  AlertAttachmentPayload,
  AttachmentAttributes,
  Case,
  UserCommentAttachmentPayload,
} from '../../../common/types/domain';
import {
  CaseRt,
  CaseStatuses,
  UserActionActions,
  UserActionTypes,
  AttachmentType,
} from '../../../common/types/domain';

import { CASE_SAVED_OBJECT, MAX_DOCS_PER_PAGE } from '../../../common/constants';
import type { CasesClientArgs } from '../../client';
import type { RefreshSetting } from '../../services/types';
import { createCaseError } from '../error';
import { AttachmentLimitChecker } from '../limiter_checker';
import type { AlertInfo } from '../types';
import type { CaseSavedObjectTransformed } from '../types/case';
import {
  countAlertsForID,
  flattenCommentSavedObjects,
  transformNewComment,
  getOrUpdateLensReferences,
  isCommentRequestTypeAlert,
  getAlertInfoFromComments,
  getIDsAndIndicesAsArrays,
} from '../utils';
import { decodeOrThrow } from '../runtime_types';
import type { AttachmentRequest, AttachmentPatchRequest } from '../../../common/types/api';

type CaseCommentModelParams = Omit<CasesClientArgs, 'authorization'>;
type CommentRequestWithId = Array<{ id: string } & AttachmentRequest>;

/**
 * This class represents a case that can have a comment attached to it.
 */
export class CaseCommentModel {
  private readonly params: CaseCommentModelParams;
  private readonly caseInfo: CaseSavedObjectTransformed;

  private constructor(caseInfo: CaseSavedObjectTransformed, params: CaseCommentModelParams) {
    this.caseInfo = caseInfo;
    this.params = params;
  }

  public static async create(
    id: string,
    options: CaseCommentModelParams
  ): Promise<CaseCommentModel> {
    const savedObject = await options.services.caseService.getCase({
      id,
    });

    return new CaseCommentModel(savedObject, options);
  }

  public get savedObject(): CaseSavedObjectTransformed {
    return this.caseInfo;
  }

  /**
   * Update a comment and update the corresponding case's update_at and updated_by fields.
   */
  public async updateComment({
    updateRequest,
    updatedAt,
    owner,
  }: {
    updateRequest: AttachmentPatchRequest;
    updatedAt: string;
    owner: string;
  }): Promise<CaseCommentModel> {
    try {
      const { id, version, ...queryRestAttributes } = updateRequest;
      const options: SavedObjectsUpdateOptions<AttachmentAttributes> = {
        version,
        /**
         * This is to handle a scenario where an update occurs for an attachment framework style comment.
         * The code that extracts the reference information from the attributes doesn't know about the reference to the case
         * and therefore will accidentally remove that reference and we'll lose the connection between the comment and the
         * case.
         */
        references: [...this.buildRefsToCase()],
        refresh: false,
      };

      if (queryRestAttributes.type === AttachmentType.user && queryRestAttributes?.comment) {
        const currentComment = (await this.params.services.attachmentService.getter.get({
          attachmentId: id,
        })) as SavedObject<UserCommentAttachmentPayload>;

        const updatedReferences = getOrUpdateLensReferences(
          this.params.lensEmbeddableFactory,
          queryRestAttributes.comment,
          currentComment
        );

        /**
         * The call to getOrUpdateLensReferences already handles retrieving the reference to the case and ensuring that is
         * also included here so it's ok to overwrite what was set before.
         */
        options.references = updatedReferences;
      }

      const [comment, commentableCase] = await Promise.all([
        this.params.services.attachmentService.update({
          attachmentId: id,
          updatedAttributes: {
            ...queryRestAttributes,
            updated_at: updatedAt,
            updated_by: this.params.user,
          },
          options,
        }),
        this.partialUpdateCaseUserAndDateSkipRefresh(updatedAt),
      ]);

      await commentableCase.createUpdateCommentUserAction(comment, updateRequest, owner);

      return commentableCase;
    } catch (error) {
      throw createCaseError({
        message: `Failed to update comment in commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }

  private async partialUpdateCaseUserAndDateSkipRefresh(date: string) {
    return this.partialUpdateCaseUserAndDate(date, false);
  }

  private async partialUpdateCaseUserAndDate(
    date: string,
    refresh: RefreshSetting
  ): Promise<CaseCommentModel> {
    try {
      const updatedCase = await this.params.services.caseService.patchCase({
        originalCase: this.caseInfo,
        caseId: this.caseInfo.id,
        updatedAttributes: {
          updated_at: date,
          updated_by: { ...this.params.user },
        },
        refresh,
      });

      return this.newObjectWithInfo({
        ...this.caseInfo,
        attributes: {
          ...this.caseInfo.attributes,
          ...updatedCase.attributes,
        },
        version: updatedCase.version ?? this.caseInfo.version,
      });
    } catch (error) {
      throw createCaseError({
        message: `Failed to update commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }

  private newObjectWithInfo(caseInfo: CaseSavedObjectTransformed): CaseCommentModel {
    return new CaseCommentModel(caseInfo, this.params);
  }

  private async createUpdateCommentUserAction(
    comment: SavedObjectsUpdateResponse<AttachmentAttributes>,
    updateRequest: AttachmentPatchRequest,
    owner: string
  ) {
    const { id, version, ...queryRestAttributes } = updateRequest;

    await this.params.services.userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.comment,
        action: UserActionActions.update,
        caseId: this.caseInfo.id,
        attachmentId: comment.id,
        payload: { attachment: queryRestAttributes },
        user: this.params.user,
        owner,
      },
    });
  }

  /**
   * Create a new comment on the appropriate case. This updates the case's updated_at and updated_by fields.
   */
  public async createComment({
    createdDate,
    commentReq,
    id,
  }: {
    createdDate: string;
    commentReq: AttachmentRequest;
    id: string;
  }): Promise<CaseCommentModel> {
    try {
      await this.validateCreateCommentRequest([commentReq]);
      const attachmentsWithoutDuplicateAlerts = await this.filterDuplicatedAlerts([
        { ...commentReq, id },
      ]);

      if (attachmentsWithoutDuplicateAlerts.length === 0) {
        return this;
      }

      const { id: commentId, ...attachment } = attachmentsWithoutDuplicateAlerts[0];

      const references = [...this.buildRefsToCase(), ...this.getCommentReferences(attachment)];

      const [comment, commentableCase] = await Promise.all([
        this.params.services.attachmentService.create({
          attributes: transformNewComment({
            createdDate,
            ...attachment,
            ...this.params.user,
          }),
          references,
          id,
          refresh: false,
        }),
        this.partialUpdateCaseUserAndDateSkipRefresh(createdDate),
      ]);

      await Promise.all([
        commentableCase.handleAlertComments([attachment]),
        this.createCommentUserAction(comment, attachment),
      ]);

      return commentableCase;
    } catch (error) {
      throw createCaseError({
        message: `Failed creating a comment on a commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }

  private async filterDuplicatedAlerts(
    attachments: CommentRequestWithId
  ): Promise<CommentRequestWithId> {
    /**
     * This function removes the elements in items that exist at the passed in positions.
     */
    const removeItemsByPosition = (items: string[], positionsToRemove: number[]): string[] =>
      items.filter((_, itemIndex) => !positionsToRemove.some((position) => position === itemIndex));

    const dedupedAlertAttachments: CommentRequestWithId = [];
    const idsAlreadySeen = new Set();
    const alertsAttachedToCase = await this.params.services.attachmentService.getter.getAllAlertIds(
      {
        caseId: this.caseInfo.id,
      }
    );

    attachments.forEach((attachment) => {
      if (!isCommentRequestTypeAlert(attachment)) {
        dedupedAlertAttachments.push(attachment);
        return;
      }

      const { ids, indices } = getIDsAndIndicesAsArrays(attachment);
      const idPositionsThatAlreadyExistInCase: number[] = [];

      ids.forEach((id, index) => {
        if (alertsAttachedToCase.has(id) || idsAlreadySeen.has(id)) {
          idPositionsThatAlreadyExistInCase.push(index);
        }

        idsAlreadySeen.add(id);
      });

      const alertIdsNotAlreadyAttachedToCase = removeItemsByPosition(
        ids,
        idPositionsThatAlreadyExistInCase
      );
      const alertIndicesNotAlreadyAttachedToCase = removeItemsByPosition(
        indices,
        idPositionsThatAlreadyExistInCase
      );

      if (
        alertIdsNotAlreadyAttachedToCase.length > 0 &&
        alertIdsNotAlreadyAttachedToCase.length === alertIndicesNotAlreadyAttachedToCase.length
      ) {
        dedupedAlertAttachments.push({
          ...attachment,
          alertId: alertIdsNotAlreadyAttachedToCase,
          index: alertIndicesNotAlreadyAttachedToCase,
        });
      }
    });

    return dedupedAlertAttachments;
  }

  private getAlertAttachments(attachments: AttachmentRequest[]): AlertAttachmentPayload[] {
    return attachments.filter(
      (attachment): attachment is AlertAttachmentPayload => attachment.type === AttachmentType.alert
    );
  }

  private async validateCreateCommentRequest(req: AttachmentRequest[]) {
    const alertAttachments = this.getAlertAttachments(req);
    const hasAlertsInRequest = alertAttachments.length > 0;

    if (hasAlertsInRequest && this.caseInfo.attributes.status === CaseStatuses.closed) {
      throw Boom.badRequest('Alert cannot be attached to a closed case');
    }

    if (req.some((attachment) => attachment.owner !== this.caseInfo.attributes.owner)) {
      throw Boom.badRequest('The owner field of the comment must match the case');
    }

    const limitChecker = new AttachmentLimitChecker(
      this.params.services.attachmentService,
      this.params.fileService,
      this.caseInfo.id
    );

    await limitChecker.validate(req);
  }

  private buildRefsToCase(): SavedObjectReference[] {
    return [
      {
        type: CASE_SAVED_OBJECT,
        name: `associated-${CASE_SAVED_OBJECT}`,
        id: this.caseInfo.id,
      },
    ];
  }

  private getCommentReferences(commentReq: AttachmentRequest) {
    let references: SavedObjectReference[] = [];

    if (commentReq.type === AttachmentType.user && commentReq?.comment) {
      const commentStringReferences = getOrUpdateLensReferences(
        this.params.lensEmbeddableFactory,
        commentReq.comment
      );
      references = [...references, ...commentStringReferences];
    }

    return references;
  }

  private async handleAlertComments(attachments: AttachmentRequest[]) {
    const alertAttachments = this.getAlertAttachments(attachments);

    const alerts = getAlertInfoFromComments(alertAttachments);

    if (alerts.length > 0) {
      await this.params.services.alertsService.ensureAlertsAuthorized({ alerts });
      await this.updateAlertsSchemaWithCaseInfo(alerts);

      if (this.caseInfo.attributes.settings.syncAlerts) {
        await this.updateAlertsStatus(alerts);
      }
    }
  }

  private async updateAlertsStatus(alerts: AlertInfo[]) {
    const alertsToUpdate = alerts.map((alert) => ({
      ...alert,
      status: this.caseInfo.attributes.status,
    }));

    await this.params.services.alertsService.updateAlertsStatus(alertsToUpdate);
  }

  private async updateAlertsSchemaWithCaseInfo(alerts: AlertInfo[]) {
    await this.params.services.alertsService.bulkUpdateCases({
      alerts,
      caseIds: [this.caseInfo.id],
    });
  }

  private async createCommentUserAction(
    comment: SavedObject<AttachmentAttributes>,
    req: AttachmentRequest
  ) {
    await this.params.services.userActionService.creator.createUserAction({
      userAction: {
        type: UserActionTypes.comment,
        action: UserActionActions.create,
        caseId: this.caseInfo.id,
        attachmentId: comment.id,
        payload: {
          attachment: req,
        },
        user: this.params.user,
        owner: comment.attributes.owner,
      },
    });
  }

  private async bulkCreateCommentUserAction(
    attachments: Array<{ id: string } & AttachmentRequest>
  ) {
    await this.params.services.userActionService.creator.bulkCreateAttachmentCreation({
      caseId: this.caseInfo.id,
      attachments: attachments.map(({ id, ...attachment }) => ({
        id,
        owner: attachment.owner,
        attachment,
      })),
      user: this.params.user,
    });
  }

  private formatForEncoding(totalComment: number) {
    return {
      id: this.caseInfo.id,
      version: this.caseInfo.version ?? '0',
      totalComment,
      ...this.caseInfo.attributes,
    };
  }

  public async encodeWithComments(): Promise<Case> {
    try {
      const comments = await this.params.services.caseService.getAllCaseComments({
        id: this.caseInfo.id,
        options: {
          fields: [],
          page: 1,
          perPage: MAX_DOCS_PER_PAGE,
        },
      });

      const totalAlerts = countAlertsForID({ comments, id: this.caseInfo.id }) ?? 0;

      const caseResponse = {
        comments: flattenCommentSavedObjects(comments.saved_objects),
        totalAlerts,
        ...this.formatForEncoding(comments.total),
      };

      return decodeOrThrow(CaseRt)(caseResponse);
    } catch (error) {
      throw createCaseError({
        message: `Failed encoding the commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }

  public async bulkCreate({
    attachments,
  }: {
    attachments: CommentRequestWithId;
  }): Promise<CaseCommentModel> {
    try {
      await this.validateCreateCommentRequest(attachments);

      const attachmentWithoutDuplicateAlerts = await this.filterDuplicatedAlerts(attachments);

      if (attachmentWithoutDuplicateAlerts.length === 0) {
        return this;
      }

      const caseReference = this.buildRefsToCase();

      const [newlyCreatedAttachments, commentableCase] = await Promise.all([
        this.params.services.attachmentService.bulkCreate({
          attachments: attachmentWithoutDuplicateAlerts.map(({ id, ...attachment }) => {
            return {
              attributes: transformNewComment({
                createdDate: new Date().toISOString(),
                ...attachment,
                ...this.params.user,
              }),
              references: [...caseReference, ...this.getCommentReferences(attachment)],
              id,
            };
          }),
          refresh: false,
        }),
        this.partialUpdateCaseUserAndDateSkipRefresh(new Date().toISOString()),
      ]);

      const savedObjectsWithoutErrors = newlyCreatedAttachments.saved_objects.filter(
        (attachment) => attachment.error == null
      );

      const attachmentsWithoutErrors = attachments.filter((attachment) =>
        savedObjectsWithoutErrors.some((so) => so.id === attachment.id)
      );

      await Promise.all([
        commentableCase.handleAlertComments(attachmentsWithoutErrors),
        this.bulkCreateCommentUserAction(attachmentsWithoutErrors),
      ]);

      return commentableCase;
    } catch (error) {
      throw createCaseError({
        message: `Failed bulk creating attachments on a commentable case, case id: ${this.caseInfo.id}: ${error}`,
        error,
        logger: this.params.logger,
      });
    }
  }
}
