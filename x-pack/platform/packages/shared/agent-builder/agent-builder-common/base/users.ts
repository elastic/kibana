/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface UserIdAndName {
  /** profile UUID */
  id?: string;
  /** username */
  username: string;
}

/**
 * Identity of the authenticated requester used in authorization decisions.
 *
 * Distinguished from {@link UserIdAndName} (which is a generic user reference, e.g. an
 * agent's stored `created_by` snapshot) so call sites can document intent: a parameter
 * typed `CurrentUser` carries the request's identity, not an arbitrary persisted reference.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CurrentUser extends UserIdAndName {}
