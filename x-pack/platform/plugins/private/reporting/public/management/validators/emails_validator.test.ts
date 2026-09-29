/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { InvalidEmailReason } from '@kbn/actions-plugin/common';
import { getEmailsValidator } from './emails_validator';

vi.mock('../translations', () => {
      const mocked = {
      getInvalidEmailAddress: (value: string) => `invalid: ${value}`,
      getNotAllowedEmailAddress: (value: string) => `not allowed: ${value}`,
    };
      return { ...mocked, default: mocked };
    });

describe('getEmailsValidator', () => {
  it('returns undefined for all valid emails', () => {
    const validateEmailAddresses = vi.fn().mockReturnValue([{ valid: true }, { valid: true }]);

    const validator = getEmailsValidator(validateEmailAddresses);
    expect(
      // @ts-expect-error form lib type uses string as type
      validator({ value: ['test1@example.com', 'test2@example.com'], path: 'some.path' })
    ).toBeUndefined();
  });

  it('returns not allowed message if one email is not allowed', () => {
    const validateEmailAddresses = vi
      .fn()
      .mockReturnValue([{ valid: false, reason: InvalidEmailReason.notAllowed }]);

    const validator = getEmailsValidator(validateEmailAddresses);
    // @ts-expect-error form lib type uses string as type
    expect(validator({ value: ['blocked@example.com'], path: 'some.path' })).toEqual({
      path: 'some.path',
      message: 'not allowed: blocked@example.com',
    });
  });

  it('returns invalid message if one email is invalid', () => {
    const validateEmailAddresses = vi
      .fn()
      .mockReturnValue([{ valid: false, reason: InvalidEmailReason.invalid }]);

    const validator = getEmailsValidator(validateEmailAddresses);
    // @ts-expect-error form lib type uses string as type
    expect(validator({ value: ['invalid@example.com'], path: 'some.path' })).toEqual({
      path: 'some.path',
      message: 'invalid: invalid@example.com',
    });
  });

  it('validates a single string value as an array', () => {
    const validateEmailAddresses = vi
      .fn()
      .mockReturnValue([{ valid: false, reason: InvalidEmailReason.invalid }]);

    const validator = getEmailsValidator(validateEmailAddresses);
    // @ts-expect-error form lib type uses string as type
    expect(validator({ value: 'not-an-email', path: 'some.path' })).toEqual({
      path: 'some.path',
      message: 'invalid: not-an-email',
    });
  });
});
