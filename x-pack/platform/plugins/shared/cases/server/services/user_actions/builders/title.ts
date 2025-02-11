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

export class TitleUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'title'>): UserActionEvent {
    const action = UserActionActions.update;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'title',
      value: args.payload.title,
      type: UserActionTypes.title,
    });

    const getMessage = (id?: string) =>
      `User updated the title for case id: ${args.caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_update_case_title',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
