/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { idHookSchemaValidation } from './validations';

describe('idSchemaValidation', () => {
  it('returns undefined for valid id', () => {
    expect(idHookSchemaValidation('valid-id')).toBeUndefined();
  });
  it('returns undefined for valid id with numbers', () => {
    expect(idHookSchemaValidation('123valid_id_123')).toBeUndefined();
  });
  it('returns undefined for valid id with underscore _', () => {
    expect(idHookSchemaValidation('valid_id')).toBeUndefined();
  });
  it('returns error message for invalid id with spaces', () => {
    expect(idHookSchemaValidation('invalid id')).toEqual(
      'Characters must be alphanumeric, _, or -'
    );
  });

  it('returns error message for invalid id with dots', () => {
    expect(idHookSchemaValidation('invalid.id')).toEqual(
      'Characters must be alphanumeric, _, or -'
    );
  });

  it('returns error message for invalid id with special characters', () => {
    expect(idHookSchemaValidation('invalid@id')).toEqual(
      'Characters must be alphanumeric, _, or -'
    );
  });
  it('returns error message for invalid id just numbers', () => {
    expect(idHookSchemaValidation('1232')).toEqual('Characters must be alphanumeric, _, or -');
  });
});
