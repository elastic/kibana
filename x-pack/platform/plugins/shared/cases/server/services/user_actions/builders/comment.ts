/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniqBy } from 'lodash';
import { CASE_COMMENT_SAVED_OBJECT } from '../../../../common/constants';
import type { AttachmentRequestV2 } from '../../../../common/types/api';
import type { CommentUserAction } from '../../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { toLegacyAttachmentRequest } from '../../../common/attachments';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';
import { buildUnifiedAttachmentSORefs, getAttachmentSOExtractor } from '../../so_references';
import { getPastTenseVerb } from './audit_logger_utils';

export class CommentUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'comment'>): UserActionEvent {
    const savedObjectType = args.savedObjectType ?? CASE_COMMENT_SAVED_OBJECT;
    const action = args.action ?? UserActionActions.update;

    // User actions persist the legacy shape (audit trail predates unified).
    // Project first so hybrid types extract the legacy reference name.
    const legacyPayload = toLegacyAttachmentRequest(
      args.payload.attachment as unknown as AttachmentRequestV2
    );

    const soExtractor = getAttachmentSOExtractor(legacyPayload);
    const { transformedFields: legacyValue, references: refsWithExternalRefId } =
      soExtractor.extractFieldsToReferences<CommentUserAction['payload']['comment']>({
        data: legacyPayload,
      });

    const commentUserAction = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'comment',
      value: legacyValue,
      type: UserActionTypes.comment,
    });
    // No-op for hybrid types; only unified-only attachments need this.
    const unifiedReferences = buildUnifiedAttachmentSORefs(legacyPayload);

    const parameters = {
      ...commentUserAction,
      references: uniqBy(
        [...commentUserAction.references, ...refsWithExternalRefId, ...unifiedReferences],
        'id'
      ),
    };

    const verb = getPastTenseVerb(action);

    const getMessage = (id?: string) =>
      `User ${verb} comment id: ${commentId(args.savedObjectId)} for case id: ${
        args.caseId
      } - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: `case_user_action_${action}_comment`,
      savedObjectId: args.savedObjectId ?? args.caseId,
      savedObjectType,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}

const commentId = (id?: string) => {
  return id ? id : 'unknown';
};
