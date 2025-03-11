/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import type {
  CaseUserActionDeprecatedResponse,
  CaseUserActionsDeprecatedResponse,
} from '../../../common/types/api';
import type { UserActionAttributes, UserActions } from '../../../common/types/domain';

export const extractAttributes = (
  userActions: SavedObjectsFindResponse<CaseUserActionDeprecatedResponse>
): CaseUserActionsDeprecatedResponse => {
  return userActions.saved_objects.map((so) => so.attributes);
};

export const formatSavedObjects = (
  response: SavedObjectsFindResponse<UserActionAttributes>
): UserActions =>
  response.saved_objects.map((so) => ({ id: so.id, version: so.version ?? '', ...so.attributes }));
