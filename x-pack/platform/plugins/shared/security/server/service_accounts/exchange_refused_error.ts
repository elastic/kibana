/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

/**
 * Why Kibana refused a token exchange before it called upstream.
 *
 * - `account_id_invalid`: the ID names no account this backend can exchange for.
 * - `account_not_found`: Kibana holds no credential for the account.
 * - `account_replaced`: the account was deleted and created again after the workload was bound.
 * - `credential_integrity`: the stored credential does not match the account it is stored for.
 * - `security_disabled`: security features are disabled in Elasticsearch.
 * - `encryption_unavailable`: Kibana cannot decrypt stored credentials.
 */
export type ServiceAccountExchangeRefusal =
  | 'account_id_invalid'
  | 'account_not_found'
  | 'account_replaced'
  | 'credential_integrity'
  | 'security_disabled'
  | 'encryption_unavailable';

/**
 * A token exchange Kibana refused before it called upstream. `refusal` says why, so the token
 * exchange metrics can tell the reasons apart where the status codes would not.
 *
 * Still a Boom error with the given status, so audit events, retry decisions and HTTP responses
 * treat it like any other refusal.
 */
export class ServiceAccountExchangeRefusedError extends Error {
  public readonly refusal: ServiceAccountExchangeRefusal;

  constructor(
    refusal: ServiceAccountExchangeRefusal,
    message: string,
    statusCode: 400 | 403 | 404
  ) {
    super(message);
    this.name = 'ServiceAccountExchangeRefusedError';
    this.refusal = refusal;
    Boom.boomify(this, { statusCode });
  }
}
