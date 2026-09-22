/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { CreateServiceAccountParams } from '@kbn/core-security-server';

import { parseCreateServiceAccountParams } from './create_params';
import { SERVICE_ACCOUNT_MAX_ROLES } from '../../common/service_accounts';

/** Returns the Boom error `parseCreateServiceAccountParams` threw, or fails the test. */
const expectRejection = (params: CreateServiceAccountParams): Boom.Boom => {
  try {
    parseCreateServiceAccountParams(params);
  } catch (e) {
    if (!Boom.isBoom(e)) {
      throw e;
    }
    return e;
  }
  throw new Error(`Expected ${JSON.stringify(params)} to be rejected`);
};

describe('parseCreateServiceAccountParams', () => {
  it('returns the parameters unchanged when only a name is given', () => {
    expect(parseCreateServiceAccountParams({ name: 'nightshift-relay' })).toEqual({
      name: 'nightshift-relay',
    });
  });

  it('returns the parameters unchanged when roles are given', () => {
    expect(
      parseCreateServiceAccountParams({ name: 'nightshift-relay', roles: ['viewer'] })
    ).toEqual({ name: 'nightshift-relay', roles: ['viewer'] });
  });

  // The name is interpolated into an Elasticsearch URL path, so a separator has to be refused
  // here and not just at the route.
  it('rejects a name containing a path separator', () => {
    const error = expectRejection({ name: '../_cluster/settings' });

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toMatch(/^Cannot create a service account: /);
    expect(error.message).toContain('`name`');
  });

  // An omitted `roles` asks Kibana to derive them; an empty one asks for none, which is a
  // different question and is refused rather than guessed at.
  it('rejects an empty roles array', () => {
    const error = expectRejection({ name: 'nightshift-relay', roles: [] });

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toMatch(/^Cannot create a service account: /);
    expect(error.message).toContain('`roles`');
  });

  it('rejects more roles than the cap allows', () => {
    const roles = new Array(SERVICE_ACCOUNT_MAX_ROLES + 1).fill('viewer');
    const error = expectRejection({ name: 'nightshift-relay', roles });

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toContain('`roles`');
  });

  it('joins several issues into one message, each prefixed with its dotted path', () => {
    const error = expectRejection({ name: 'not/valid', roles: [] });

    expect(error.message).toMatch(/^Cannot create a service account: /);
    expect(error.message).toContain('; ');
    expect(error.message).toContain('`name`');
    expect(error.message).toContain('`roles`');
  });

  it('falls back to `params` when the issue has no path', () => {
    const error = expectRejection('nightshift-relay' as unknown as CreateServiceAccountParams);

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toContain('`params`');
  });
});
