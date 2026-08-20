/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionEvent, UserActionParameters } from '../types';

export class WorkflowUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'workflow'>): UserActionEvent {
    const { caseId } = args;
    const action = UserActionActions.create;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'workflow',
      value: args.payload.workflow,
      type: UserActionTypes.workflow,
    });
    parameters.attributes.payload = args.payload;

    const getMessage = (id?: string) =>
      `User ran workflow id: ${args.payload.workflow.id} for case id: ${caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_workflow',
      savedObjectId: caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
