/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { UserActionTypes, UserActionActions } from '../../../domain/user_action/action/v1';

export { UserActionTypes, UserActionActions };
export type { UserActionType, UserActionAction } from '../../../domain/user_action/action/v1';

export const UserActionActionsSchema = z.enum(
  Object.values(UserActionActions) as [string, ...string[]]
);
