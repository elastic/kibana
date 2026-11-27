/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiPrivileges } from '../../../common/features';

export const NO_PROFILE_MESSAGE =
  'The caller has no user profile, so the request cannot be attributed to a user. Log in to Kibana once to create a profile, use an API key whose owner has one, or set `user_id` if you have the `contextEngine:manage_memory` privilege.';

export const MANAGE_MEMORY_REQUIRED_MESSAGE = `Acting on the memory of another user requires the [${apiPrivileges.manageMemory}] privilege.`;

export const WRITE_REQUIRED_MESSAGE = `Writing session memory requires the [${apiPrivileges.writeContextEngine}] privilege.`;

/** The caller may not write the memory of the target user. Named `Forbidden` in audit events. */
export class MemoryForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Forbidden';
  }
}
