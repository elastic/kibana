/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { createGetClassicRuleTypeMigration } from './classic_rule_type_migration';

describe('createGetClassicRuleTypeMigration', () => {
  it('returns the migration a rule type registered', () => {
    const migration = { toV2Draft: jest.fn() };
    const getType = jest.fn().mockReturnValue({ id: '.es-query', alertingV2Migration: migration });

    expect(createGetClassicRuleTypeMigration({ getType })('.es-query')).toBe(migration);
    expect(getType).toHaveBeenCalledWith('.es-query');
  });

  it('returns undefined for a rule type without a migration', () => {
    const getType = jest.fn().mockReturnValue({ id: '.index-threshold' });

    expect(createGetClassicRuleTypeMigration({ getType })('.index-threshold')).toBeUndefined();
  });

  it('returns undefined for a rule type that is not registered', () => {
    const getType = jest.fn().mockImplementation(() => {
      throw Boom.badRequest('Rule type "missing" is not registered.');
    });

    expect(createGetClassicRuleTypeMigration({ getType })('missing')).toBeUndefined();
  });

  it('rethrows unexpected errors', () => {
    const getType = jest.fn().mockImplementation(() => {
      throw new Error('boom');
    });

    expect(() => createGetClassicRuleTypeMigration({ getType })('.es-query')).toThrow('boom');
  });
});
