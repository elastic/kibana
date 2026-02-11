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

export class ObservablesUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'observables'>): UserActionEvent {
    const { caseId } = args;
    const action = UserActionActions.create;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'observables',
      value: args.payload.observables,
      type: UserActionTypes.observables,
    });

    const getMessage = (id?: string) =>
      `User added observables to case id: ${caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_observables',
      savedObjectId: caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
