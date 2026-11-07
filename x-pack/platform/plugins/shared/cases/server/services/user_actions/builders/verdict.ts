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

export class AiVerdictUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'ai_verdict'>): UserActionEvent {
    const action = UserActionActions.update;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'ai_verdict',
      value: args.payload.ai_verdict,
      type: UserActionTypes.ai_verdict,
    });

    const eventDetails: EventDetails = {
      getMessage: (id?: string) =>
        `User updated the AI verdict for case id: ${args.caseId} - user action id: ${id}`,
      action,
      descriptiveAction: 'case_user_action_update_case_ai_verdict',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return { parameters, eventDetails };
  }
}

export class HumanVerdictUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'human_verdict'>): UserActionEvent {
    const action = UserActionActions.update;

    const parameters = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'human_verdict',
      value: args.payload.human_verdict,
      type: UserActionTypes.human_verdict,
    });

    const eventDetails: EventDetails = {
      getMessage: (id?: string) =>
        `User updated the human verdict for case id: ${args.caseId} - user action id: ${id}`,
      action,
      descriptiveAction: 'case_user_action_update_case_human_verdict',
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return { parameters, eventDetails };
  }
}
