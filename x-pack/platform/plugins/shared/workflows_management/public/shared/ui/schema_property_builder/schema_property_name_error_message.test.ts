/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateSchemaPropertyName } from './schema_property_model';
import { schemaPropertyNameErrorMessage } from './schema_property_name_error_message';
import type { SchemaPropertyNameError } from './types';

describe('schemaPropertyNameErrorMessage', () => {
  it.each<SchemaPropertyNameError>(['empty', 'invalid', 'duplicate', 'reserved'])(
    'has a message for the %s error',
    (error) => {
      expect(schemaPropertyNameErrorMessage(error)).toEqual(expect.any(String));
    }
  );

  it('has no message when the name is valid', () => {
    expect(schemaPropertyNameErrorMessage(null)).toBeUndefined();
  });

  it('explains why __proto__ is rejected, instead of marking the field invalid silently', () => {
    expect(
      schemaPropertyNameErrorMessage(validateSchemaPropertyName('__proto__', [], 'a'))
    ).toMatch(/reserved/i);
  });
});
