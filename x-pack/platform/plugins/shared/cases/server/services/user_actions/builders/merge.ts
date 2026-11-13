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

export class MergeUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'merge'>): UserActionEvent {
    const { caseId, user, owner, payload } = args;
    const action = UserActionActions.update;

    // Only the case being recorded is referenced: user action queries match any `cases`
    // reference, so referencing the other cases would show this entry in their activity too.
    const parameters = {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action,
        payload,
        type: UserActionTypes.merge,
      },
      references: this.createCaseReferences(caseId),
    };

    const getMessage = (id?: string) =>
      `User merged cases [${payload.merge.sources
        .map((source) => source.id)
        .join(', ')}] into case id: ${
        payload.merge.destination.id
      } for case id: ${caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_merge_cases',
      savedObjectId: caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return { parameters, eventDetails };
  }
}
