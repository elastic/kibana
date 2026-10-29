/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';

export class BulkAttachmentsUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'bulkAttachments'>): UserActionEvent {
    const { caseId, payload } = args;
    const action = UserActionActions.delete;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'bulkAttachments',
      value: payload.bulkAttachments,
      type: UserActionTypes.bulkAttachments,
    });

    const { attachmentType, count } = payload.bulkAttachments;
    const noun = count === 1 ? 'item' : 'items';
    const getMessage = (id?: string) =>
      `User deleted ${count} ${attachmentType} ${noun} from case id: ${caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_delete_attachments',
      savedObjectId: caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
