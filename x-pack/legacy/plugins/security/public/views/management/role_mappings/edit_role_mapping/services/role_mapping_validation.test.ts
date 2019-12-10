/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  validateRoleMappingName,
  validateRoleMappingRoles,
  validateRoleMappingRoleTemplates,
  validateRoleMappingRules,
  validateRoleMappingForSave,
} from './role_mapping_validation';
import { RoleMapping } from '../../../../../../common/model';

describe('validateRoleMappingName', () => {
  it('requires a value', () => {
    expect(validateRoleMappingName({ name: '' } as RoleMapping)).toMatchInlineSnapshot(`
      Object {
        "error": "Name is required.",
        "isInvalid": true,
      }
    `);
  });
});

describe('validateRoleMappingRoles', () => {
  it('requires a value', () => {
    expect(validateRoleMappingRoles(({ roles: [] } as unknown) as RoleMapping))
      .toMatchInlineSnapshot(`
      Object {
        "error": "At least one role is required.",
        "isInvalid": true,
      }
    `);
  });
});

describe('validateRoleMappingRoleTemplates', () => {
  it('requires a value', () => {
    expect(validateRoleMappingRoleTemplates(({ role_templates: [] } as unknown) as RoleMapping))
      .toMatchInlineSnapshot(`
      Object {
        "error": "At least one role template is required.",
        "isInvalid": true,
      }
    `);
  });
});

describe('validateRoleMappingRules', () => {
  it('requires at least one rule', () => {
    expect(validateRoleMappingRules({ rules: {} } as RoleMapping)).toMatchInlineSnapshot(`
      Object {
        "error": "At least one rule is required.",
        "isInvalid": true,
      }
    `);
  });

  // more exhaustive testing is done in other unit tests
  it('requires rules to be valid', () => {
    expect(validateRoleMappingRules(({ rules: { something: [] } } as unknown) as RoleMapping))
      .toMatchInlineSnapshot(`
      Object {
        "error": "Unknown rule type: something.",
        "isInvalid": true,
      }
    `);
  });
});

describe('validateRoleMappingForSave', () => {
  it('fails if the role mapping is missing a name', () => {
    expect(
      validateRoleMappingForSave(({
        enabled: true,
        roles: ['superuser'],
        rules: { field: { username: '*' } },
      } as unknown) as RoleMapping)
    ).toMatchInlineSnapshot(`
      Object {
        "error": "Name is required.",
        "isInvalid": true,
      }
    `);
  });

  it('fails if the role mapping is missing rules', () => {
    expect(
      validateRoleMappingForSave(({
        name: 'foo',
        enabled: true,
        roles: ['superuser'],
        rules: {},
      } as unknown) as RoleMapping)
    ).toMatchInlineSnapshot(`
      Object {
        "error": "At least one rule is required.",
        "isInvalid": true,
      }
    `);
  });

  it('fails if the role mapping is missing both roles and templates', () => {
    expect(
      validateRoleMappingForSave(({
        name: 'foo',
        enabled: true,
        roles: [],
        role_templates: [],
        rules: { field: { username: '*' } },
      } as unknown) as RoleMapping)
    ).toMatchInlineSnapshot(`
      Object {
        "error": "At least one role is required.",
        "isInvalid": true,
      }
    `);
  });

  it('validates a correct role mapping using role templates', () => {
    expect(
      validateRoleMappingForSave(({
        name: 'foo',
        enabled: true,
        roles: [],
        role_templates: [{ template: { id: 'foo' } }],
        rules: { field: { username: '*' } },
      } as unknown) as RoleMapping)
    ).toMatchInlineSnapshot(`
      Object {
        "isInvalid": false,
      }
    `);
  });

  it('validates a correct role mapping using roles', () => {
    expect(
      validateRoleMappingForSave(({
        name: 'foo',
        enabled: true,
        roles: ['superuser'],
        rules: { field: { username: '*' } },
      } as unknown) as RoleMapping)
    ).toMatchInlineSnapshot(`
      Object {
        "isInvalid": false,
      }
    `);
  });
});
