/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import type { UserActionAttributes } from '../../../common/types/domain';
import {
  UserActionAttributesRt,
  CaseUserActionWithoutReferenceIdsRt,
} from '../../../common/types/domain';
import type { User } from './user';

interface UserActionCommonPersistedAttributes {
  action: string;
  created_at: string;
  created_by: User;
  owner: string;
}

export interface UserActionPersistedAttributes extends UserActionCommonPersistedAttributes {
  type: string;
  payload: Record<string, unknown>;
}

export const UserActionTransformedAttributesRt = UserActionAttributesRt;
export const UserActionPersistedAttributesRt = CaseUserActionWithoutReferenceIdsRt;

export type UserActionTransformedAttributes = UserActionAttributes;
export type UserActionSavedObjectTransformed = SavedObject<UserActionTransformedAttributes>;
