/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UserActionActions, UserActionTypes, CaseStatuses } from '../../../../common/types/domain';
import { CASE_SAVED_OBJECT } from '../../../../common/constants';
import { UserActionBuilder } from '../abstract_builder';
import type { EventDetails, UserActionParameters, UserActionEvent } from '../types';

export class CreateCaseUserActionBuilder extends UserActionBuilder {
  build(args: UserActionParameters<'create_case'>): UserActionEvent {
    const { payload, caseId, owner, user } = args;
    const action = UserActionActions.create;

    const connectorWithoutId = this.extractConnectorId(payload.connector);
    const parameters = {
      attributes: {
        ...this.getCommonUserActionAttributes({ user, owner }),
        action,
        payload: { ...payload, connector: connectorWithoutId, status: CaseStatuses.open },
        type: UserActionTypes.create_case,
      },
      references: [
        ...this.createCaseReferences(caseId),
        ...this.createConnectorReference(payload.connector.id),
      ],
    };

    const getMessage = (id?: string) => `User created case id: ${caseId} - user action id: ${id}`;

    const eventDetails: EventDetails = {
      getMessage,
      action,
      descriptiveAction: 'case_user_action_create_case',
      savedObjectId: caseId,
      savedObjectType: CASE_SAVED_OBJECT,
    };

    return {
      parameters,
      eventDetails,
    };
  }
}
