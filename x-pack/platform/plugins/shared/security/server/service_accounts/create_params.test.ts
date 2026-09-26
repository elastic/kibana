/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import type { CreateServiceAccountParams } from '@kbn/core-security-server';

import { parseCreateServiceAccountParams } from './create_params';

/** Each backend passes its own limits. Small ones keep the boundary cases readable. */
const limits = { maxRoles: 3, maxRoleNameLength: 8 };
const { maxRoles, maxRoleNameLength } = limits;

/** Returns the Boom error `parseCreateServiceAccountParams` threw, or fails the test. */
const expectRejection = (params: CreateServiceAccountParams): Boom.Boom => {
  try {
    parseCreateServiceAccountParams(params, limits);
  } catch (e) {
    if (!Boom.isBoom(e)) {
      throw e;
    }
    return e;
  }
  throw new Error(`Expected ${JSON.stringify(params)} to be rejected`);
};

describe('parseCreateServiceAccountParams', () => {
  it('returns valid parameters unchanged', () => {
    expect(
      parseCreateServiceAccountParams(
        { name: 'nightshift-relay', roles: ['viewer', 'editor'] },
        limits
      )
    ).toEqual({ name: 'nightshift-relay', roles: ['viewer', 'editor'] });
  });

  it('drops duplicate roles, keeping first occurrences in order', () => {
    expect(
      parseCreateServiceAccountParams(
        { name: 'nightshift-relay', roles: ['viewer', 'editor', 'viewer'] },
        limits
      )
    ).toEqual({ name: 'nightshift-relay', roles: ['viewer', 'editor'] });
  });

  // There is no "derive them from the creator" default, so an omitted `roles` is a 400 and not
  // the widest grant the creator could make.
  it('rejects an omitted roles array', () => {
    const error = expectRejection({ name: 'nightshift-relay' } as CreateServiceAccountParams);

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toContain('`roles`');
  });

  // The name is interpolated into an Elasticsearch URL path, so a separator has to be refused
  // here and not just at the route.
  it('rejects a name containing a path separator', () => {
    const error = expectRejection({ name: '../_cluster/settings', roles: ['viewer'] });

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toMatch(/^Cannot create a service account: /);
    expect(error.message).toContain('`name`');
  });

  it('rejects an empty roles array', () => {
    const error = expectRejection({ name: 'nightshift-relay', roles: [] });

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toMatch(/^Cannot create a service account: /);
    expect(error.message).toContain('`roles`');
  });

  it('accepts as many distinct roles as the cap allows', () => {
    const roles = Array.from({ length: maxRoles }, (_, i) => `role-${i}`);

    expect(parseCreateServiceAccountParams({ name: 'nightshift-relay', roles }, limits)).toEqual({
      name: 'nightshift-relay',
      roles,
    });
  });

  it('rejects more distinct roles than the cap allows', () => {
    const roles = Array.from({ length: maxRoles + 1 }, (_, i) => `role-${i}`);
    const error = expectRejection({ name: 'nightshift-relay', roles });

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toContain('`roles`');
  });

  it('accepts a role name as long as the limit allows', () => {
    const roles = ['a'.repeat(maxRoleNameLength)];

    expect(parseCreateServiceAccountParams({ name: 'nightshift-relay', roles }, limits)).toEqual({
      name: 'nightshift-relay',
      roles,
    });
  });

  it('rejects a role name longer than the limit allows', () => {
    const error = expectRejection({
      name: 'nightshift-relay',
      roles: ['a'.repeat(maxRoleNameLength + 1)],
    });

    expect(error.output.statusCode).toBe(400);
    expect(error.message).toContain('`roles.0`');
  });

  // The cap counts distinct roles, so a list that only overruns it through repetition is fine.
  it('applies the cap after dropping duplicates', () => {
    const roles = new Array(maxRoles + 1).fill('viewer');

    expect(parseCreateServiceAccountParams({ name: 'nightshift-relay', roles }, limits)).toEqual({
      name: 'nightshift-relay',
      roles: ['viewer'],
    });
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
