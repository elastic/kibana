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

export class DecisionUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'decision'>): UserActionEvent {
    const action = UserActionActions.update;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'decision',
      value: args.payload.decision,
      type: UserActionTypes.decision,
    });

    const eventDetails: EventDetails = {
      getMessage: (id?: string) =>
        `User ${args.payload.decision.outcome} proposal ${args.payload.decision.proposal_id} on case id: ${args.caseId} - user action id: ${id}`,
      action,
      descriptiveAction: 'case_user_action_decide_proposal',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return { parameters, eventDetails };
  }
}
