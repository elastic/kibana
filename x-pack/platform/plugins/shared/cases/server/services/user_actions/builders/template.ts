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

export class TemplateUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'template'>): UserActionEvent {
    const parameters = this.buildCommonUserAction({
      ...args,
      action: UserActionActions.update,
      valueKey: 'template',
      value: args.payload.template,
      type: UserActionTypes.template,
    });

    const getMessage = (id?: string) =>
      `User changed applied template for case id: ${args.caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action: UserActionActions.update,
      descriptiveAction: 'case_user_action_change_applied_template',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return { parameters, eventDetails };
  }
}
