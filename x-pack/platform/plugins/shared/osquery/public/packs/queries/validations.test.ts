/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { idHookSchemaValidation, createFormIdFieldValidations } from './validations';

describe('createFormIdFieldValidations', () => {
  it('returns no error for a unique valid ID', () => {
    const existingIds = new Set(['existing-id-1', 'existing-id-2']);
    const { validate } = createFormIdFieldValidations(existingIds);
    expect(validate('new-unique-id')).toBeUndefined();
  });

  it('returns "ID must be unique" for a duplicate ID', () => {
    const existingIds = new Set(['existing-id-1', 'existing-id-2']);
    const { validate } = createFormIdFieldValidations(existingIds);
    expect(validate('existing-id-1')).toBe('ID must be unique');
  });

  it('returns pattern error for invalid characters', () => {
    const existingIds = new Set<string>();
    const { validate } = createFormIdFieldValidations(existingIds);
    expect(validate('invalid.id')).toBe('Characters must be alphanumeric, _, or -');
  });

  it('returns pattern error over uniqueness error for invalid duplicate', () => {
    const existingIds = new Set(['invalid id']);
    const { validate } = createFormIdFieldValidations(existingIds);
    // Pattern validation runs first
    expect(validate('invalid id')).toBe('Characters must be alphanumeric, _, or -');
  });

  it('has a required validation rule', () => {
    const existingIds = new Set<string>();
    const rules = createFormIdFieldValidations(existingIds);
    expect(rules.required.value).toBe(true);
    expect(rules.required.message).toBe('ID is required');
  });
});

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
