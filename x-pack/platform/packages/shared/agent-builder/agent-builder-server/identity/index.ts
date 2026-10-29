/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  toStableUserId,
  resolveApiKeyOwnerProfileUid,
  isAdminFromRequest,
  type StableUserIdAuthUser,
} from './stable_user_id';
export { USER_PRINCIPAL_PREFIX, toUserPrincipal, isUserPrincipal } from './user_principal';
