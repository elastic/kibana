/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type SpecVersionRequestErrorReason =
  | 'not_stored'
  | 'no_version_for_major'
  | 'invalid_request';

/** Thrown when a create/update/spec request names a version this cluster cannot serve. */
export class SpecVersionRequestError extends Error {
  public readonly reason: SpecVersionRequestErrorReason;
  public readonly actionTypeId: string;
  public readonly requested: string;

  constructor({
    reason,
    actionTypeId,
    requested,
    message,
  }: {
    reason: SpecVersionRequestErrorReason;
    actionTypeId: string;
    requested: string;
    message: string;
  }) {
    super(message);
    this.name = 'SpecVersionRequestError';
    this.reason = reason;
    this.actionTypeId = actionTypeId;
    this.requested = requested;
  }
}
