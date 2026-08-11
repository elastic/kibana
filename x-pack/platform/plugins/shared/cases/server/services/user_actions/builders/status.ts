/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { CaseStatuses, UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';

export class StatusUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'status'>): UserActionEvent {
    const action = UserActionActions.update;
    const shouldLogCloseReasonSyncMessage =
      args.payload.status === CaseStatuses.closed &&
      args.payload.syncAlerts === true &&
      args.payload.closeReason != null;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'status',
      value: args.payload.status,
      type: UserActionTypes.status,
    });

    parameters.attributes.payload = {
      ...parameters.attributes.payload,
      ...(shouldLogCloseReasonSyncMessage ? { closeReason: args.payload.closeReason } : {}),
      ...(args.payload.syncedAlertCount != null
        ? { syncedAlertCount: args.payload.syncedAlertCount }
        : {}),
    };
    const getMessage = (id?: string) =>
      shouldLogCloseReasonSyncMessage
        ? `User closed case id: ${args.caseId} and synced alerts with a close reason - user action id: ${id}`
        : `User updated the status for case id: ${args.caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_update_case_status',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
