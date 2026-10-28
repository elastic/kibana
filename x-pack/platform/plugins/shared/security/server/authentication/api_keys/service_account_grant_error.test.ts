/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import type { AuthenticatedUser } from '@kbn/core-security-common';
import {
  CLOUD_SERVICE_ACCOUNT_REALM_TYPE,
  SERVICE_ACCOUNT_REALM_TYPE,
} from '@kbn/core-security-common';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';

import { toServiceAccountGrantError } from './service_account_grant_error';

const serviceAccountUser = (realmType: string, username: string) =>
  mockAuthenticatedUser({
    username,
    authentication_provider: { type: 'http', name: '__http__' },
    authentication_realm: { name: realmType, type: realmType },
    authentication_type: 'token',
  }) as AuthenticatedUser;

const esServiceAccount = serviceAccountUser(SERVICE_ACCOUNT_REALM_TYPE, 'kibana/automation');

const esError = (statusCode: number, body: Record<string, unknown>) =>
  new errors.ResponseError(elasticsearchServiceMock.createApiResponse({ statusCode, body }));

const esRefusal = (statusCode: number, reason: string) =>
  esError(statusCode, { error: { type: 'security_exception', reason } });

describe('toServiceAccountGrantError', () => {
  it('names the account and keeps the status of an Elasticsearch refusal', () => {
    const error = toServiceAccountGrantError(esRefusal(400, 'built-in account'), esServiceAccount);

    expect(Boom.isBoom(error)).toBe(true);
    expect(error?.output.statusCode).toBe(400);
    expect(error?.message).toBe(
      'Unable to grant an API key for service account [kibana/automation]: built-in account'
    );
  });

  it('uses the message of a UIAM refusal', () => {
    const error = toServiceAccountGrantError(
      Boom.forbidden('[0x8E231F] not supported'),
      serviceAccountUser(CLOUD_SERVICE_ACCOUNT_REALM_TYPE, 'organization-service-account-id')
    );

    expect(error?.output.statusCode).toBe(403);
    expect(error?.message).toBe(
      'Unable to grant an API key for service account [organization-service-account-id]: ' +
        '[0x8E231F] not supported'
    );
  });

  it('maps a 401 to a 403', () => {
    expect(
      toServiceAccountGrantError(esRefusal(401, 'unable to authenticate'), esServiceAccount)?.output
        .statusCode
    ).toBe(403);
  });

  it('prefers the reason the caller supplies', () => {
    expect(
      toServiceAccountGrantError(esRefusal(403, 'Failed to authenticate'), esServiceAccount, {
        reason: 'service accounts are disabled',
      })?.message
    ).toBe(
      'Unable to grant an API key for service account [kibana/automation]: service accounts are disabled'
    );
  });

  it('falls back to a generic reason when Elasticsearch gives none', () => {
    expect(toServiceAccountGrantError(esError(400, {}), esServiceAccount)?.message).toBe(
      'Unable to grant an API key for service account [kibana/automation]: the request was refused'
    );
  });

  it.each([
    ['a user', mockAuthenticatedUser() as AuthenticatedUser],
    ['no user', null],
  ])('returns undefined for %s', (_, user) => {
    expect(toServiceAccountGrantError(esRefusal(400, 'refused'), user)).toBeUndefined();
  });

  it.each([
    ['an Elasticsearch server error', esRefusal(503, 'unavailable')],
    ['a UIAM server error', Boom.serverUnavailable('unavailable')],
    ['an error from neither backend', new Error('socket hang up')],
  ])('returns undefined for %s', (_, sourceError) => {
    expect(toServiceAccountGrantError(sourceError, esServiceAccount)).toBeUndefined();
  });
});
