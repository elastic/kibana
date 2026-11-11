/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when a service account bound request needs a new credential and will never get one: its
 * workload binding is gone or was replaced, its account was revoked, its lease expired, or it was
 * released while the new credential was minted.
 *
 * The message is fixed and there is no cause. Callers surface this error to whoever started the
 * work, and an upstream refusal can carry credentials.
 */
export class ServiceAccountCredentialRefusedError extends Error {
  public readonly code = 'SERVICE_ACCOUNT_CREDENTIAL_REFUSED';

  constructor() {
    super(
      'The service account credential of this request needs refreshing, but a replacement was refused.'
    );
    this.name = 'ServiceAccountCredentialRefusedError';
  }
}
