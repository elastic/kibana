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

export class CustomFieldsUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'customFields'>): UserActionEvent {
    const action = args.action ?? UserActionActions.add;

    const soParams = this.buildCommonUserAction({
      ...args,
      action,
      valueKey: 'customFields',
      value: args.payload.customFields,
      type: UserActionTypes.customFields,
    });

    const keys = args.payload.customFields.map((customField) => customField.key);
    const verbMessage = getVerbMessage(action, keys);

    const getMessage = (id?: string) =>
      `User ${verbMessage} case id: ${args.caseId} - user action id: ${id}`;

    const event: EventDetails = {
      getMessage,
      action,
      descriptiveAction: `case_user_action_${action}_case_custom_fields`,
      savedObjectId: args.caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters: soParams,
      eventDetails: event,
    };
  }
}

const getVerbMessage = (action: UserActionAction, keys: string[]) => {
  const keysText = `keys: [${keys}]`;

  switch (action) {
    case 'add':
      return `added ${keysText} to`;
    case 'delete':
      return `deleted ${keysText} from`;
    default:
      return `changed ${keysText} for`;
  }
};
