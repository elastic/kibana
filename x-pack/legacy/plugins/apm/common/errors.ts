/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ErrorStatus {
  ACTIVE = 'active',
  MUTED = 'muted',
  RESOLVED = 'resolved',
  REOCCURED = 'reoccured',
  NEW = 'new'
}

export const ALL_ERRORS = 'all';
export const ACTIVE_ERRORS = 'active';
export const ARCHIVED_ERRORS = 'archived';

export type ErrorStatusGroup =
  | typeof ALL_ERRORS
  | typeof ACTIVE_ERRORS
  | typeof ARCHIVED_ERRORS;
