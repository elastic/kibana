/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Thrown when read state is written for a request that carries no user profile. */
export class UserProfileRequiredError extends Error {
  constructor() {
    super('Notification read state requires a user profile.');
    this.name = 'UserProfileRequiredError';
  }
}
