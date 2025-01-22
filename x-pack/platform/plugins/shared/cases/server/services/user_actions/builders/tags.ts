/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import type { UserActionAction } from '../../../../common/types/domain';
import { UserActionActions, UserActionTypes } from '../../../../common/types/domain';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';
import { getPastTenseVerb } from './audit_logger_utils';

export class TagsUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'tags'>): UserActionEvent {
    const action = args.action ?? UserActionActions.add;

    const parameters = this.buildCommonUserAction({
      ...args,
      action: args.action ?? UserActionActions.add,
      valueKey: 'tags',
      value: args.payload.tags,
      type: UserActionTypes.tags,
    });

    const verb = getPastTenseVerb(action);
    const preposition = getPreposition(action);

    const getMessage = (id?: string) =>
      `User ${verb} tags ${preposition} case id: ${args.caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: `case_user_action_${action}_case_tags`,
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}

const getPreposition = (action: UserActionAction): string => {
  switch (action) {
    case UserActionActions.add:
      return 'to';
    case UserActionActions.delete:
      return 'in';
    default:
      return 'for';
  }
};
