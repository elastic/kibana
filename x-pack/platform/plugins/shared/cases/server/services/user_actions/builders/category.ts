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

export class CategoryUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'category'>): UserActionEvent {
    const value = args.payload.category;
    const action = value != null ? UserActionActions.update : UserActionActions.delete;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'category',
      value,
      type: UserActionTypes.category,
    });

    const getMessage = (id?: string) =>
      `User updated the category for case id: ${args.caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_update_case_category',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
