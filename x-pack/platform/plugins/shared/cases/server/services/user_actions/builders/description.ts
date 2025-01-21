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

export class DescriptionUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'description'>): UserActionEvent {
    const action = UserActionActions.update;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'description',
      type: UserActionTypes.description,
      value: args.payload.description,
    });

    const getMessage = (id?: string) =>
      `User updated the description for case id: ${args.caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_update_case_description',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
