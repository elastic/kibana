/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getBulkCreateOrUpdatePayloadSchema } from './bulk_create_or_update_payload';

describe('getBulkCreateOrUpdatePayloadSchema', () => {
  const mockGetBasePrivilegeNames = jest.fn(() => ({
    global: ['all', 'read'],
    space: ['all', 'read'],
  }));

  const bulkCreateOrUpdatePayloadSchema =
    getBulkCreateOrUpdatePayloadSchema(mockGetBasePrivilegeNames);

  it('should validate a correct payload', () => {
    const payload = {
      roles: {
        role1: {
          kibana: [
            {
              feature: {
                feature1: ['all'],
              },
              spaces: ['*'],
            },
          ],
        },
      },
    };

    expect(() => bulkCreateOrUpdatePayloadSchema.validate(payload)).not.toThrow();
  });

  it('should throw an error for missing roles', () => {
    const payload = {};

    expect(() =>
      bulkCreateOrUpdatePayloadSchema.validate(payload)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[roles]: expected value of type [object] but got [undefined]"`
    );
  });

  it('should throw an error for invalid role structure', () => {
    const payload = {
      roles: {
        role1: 'invalid_structure',
      },
    };

    expect(() =>
      bulkCreateOrUpdatePayloadSchema.validate(payload)
    ).toThrowErrorMatchingInlineSnapshot(
      `"[roles.role1]: could not parse object value from json input"`
    );
  });

  it('should throw an error when too many roles are provided', () => {
    const roles = Object.fromEntries(
      Array.from({ length: 101 }, (_, i) => [`role${i}`, { kibana: [] }])
    );

    expect(() => bulkCreateOrUpdatePayloadSchema.validate({ roles })).toThrowError(
      '[roles]: cannot contain more than 100 roles'
    );
  });

  it('should accept the maximum number of roles', () => {
    const roles = Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [`role${i}`, { kibana: [] }])
    );

    expect(() => bulkCreateOrUpdatePayloadSchema.validate({ roles })).not.toThrow();
  });

  it('should throw an error when a role name is too long', () => {
    expect(() =>
      bulkCreateOrUpdatePayloadSchema.validate({ roles: { ['a'.repeat(1025)]: { kibana: [] } } })
    ).toThrowError(/key\("a+"\)/);
  });

  it('should throw an error for an empty role name', () => {
    expect(() =>
      bulkCreateOrUpdatePayloadSchema.validate({ roles: { '': { kibana: [] } } })
    ).toThrowError(/key\(""\)/);
  });
});
