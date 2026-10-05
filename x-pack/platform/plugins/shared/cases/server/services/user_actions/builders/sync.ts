/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';

export class SyncUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'sync'>): UserActionEvent {
    const action = UserActionActions.update;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'sync',
      value: args.payload.sync,
      type: UserActionTypes.sync,
    });

    const getMessage = (id?: string) =>
      `User synced case id: ${args.caseId} from external incident: ${args.payload.sync.external_id} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_synced_case',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
