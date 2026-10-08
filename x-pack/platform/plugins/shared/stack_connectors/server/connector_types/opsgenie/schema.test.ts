/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CloseAlertParamsSchema,
  CreateAlertParamsSchema,
  MESSAGE_SCHEMA_MAX_LENGTH,
} from './schema';
import {
  OpsgenieCloseAlertExample,
  OpsgenieCreateAlertExample,
  ValidCreateAlertSchema,
} from './test_schema';

describe('opsgenie schema', () => {
  describe('CreateAlertParamsSchema', () => {
    it.each([
      ['ValidCreateAlertSchema', ValidCreateAlertSchema],
      ['OpsgenieCreateAlertExample', OpsgenieCreateAlertExample],
    ])('validates the test object [%s] correctly', (objectName, testObject) => {
      expect(() => CreateAlertParamsSchema.validate(testObject)).not.toThrow();
    });

    it.each([
      ['length 1', 'a'],
      ['length 130', 'a'.repeat(130)],
      ['length 131', 'a'.repeat(131)],
      ['length MESSAGE_SCHEMA_MAX_LENGTH', 'a'.repeat(MESSAGE_SCHEMA_MAX_LENGTH)],
    ])('accepts a message of %s', (_name, message) => {
      expect(() => CreateAlertParamsSchema.validate({ message })).not.toThrow();
    });

    it.each([
      ['length MESSAGE_SCHEMA_MAX_LENGTH + 1', 'a'.repeat(MESSAGE_SCHEMA_MAX_LENGTH + 1)],
      ['empty', ''],
      ['whitespace-only', '   '],
    ])('rejects a message that is %s', (_name, message) => {
      expect(() => CreateAlertParamsSchema.validate({ message })).toThrow();
    });
  });

  describe('CloseAlertParamsSchema', () => {
    it.each([['OpsgenieCloseAlertExample', OpsgenieCloseAlertExample]])(
      'validates the test object [%s] correctly',
      (objectName, testObject) => {
        expect(() => CloseAlertParamsSchema.validate(testObject)).not.toThrow();
      }
    );
  });
});
