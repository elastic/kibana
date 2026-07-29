/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PostEnrollmentAPIKeyRequestSchema } from './enrollment_api_key';

describe('PostEnrollmentAPIKeyRequestSchema', () => {
  const validate = (expiration: unknown) =>
    PostEnrollmentAPIKeyRequestSchema.body.validate({
      policy_id: 'test-policy',
      expiration,
    });

  describe('expiration field validation', () => {
    const validDurations = [
      '1d',
      '7d',
      '30d',
      '24h',
      '60m',
      '90s',
      '106751d',
      '2562024h',
      '153721440m',
      '9223286400s',
    ];

    validDurations.forEach((value) => {
      it(`accepts valid duration "${value}"`, () => {
        expect(() => validate(value)).not.toThrow();
      });
    });

    it('accepts missing expiration (field is optional)', () => {
      expect(() =>
        PostEnrollmentAPIKeyRequestSchema.body.validate({ policy_id: 'test-policy' })
      ).not.toThrow();
    });

    const invalidDurations = [
      ['7D', 'uppercase unit'],
      ['7', 'bare integer without unit'],
      ['d', 'unit without integer'],
      ['7 d', 'space between number and unit'],
      ['notaduration', 'arbitrary string'],
      ['-1d', 'negative value'],
      ['1.5d', 'decimal value'],
      ['7days', 'full unit word'],
      ['7w', 'unsupported unit (weeks)'],
      ['500ms', 'unsupported unit (ms)'],
      ['100micros', 'unsupported unit (micros)'],
      ['50nanos', 'unsupported unit (nanos)'],
      ['0d', 'zero value (already-expired token)'],
      ['0h', 'zero hours'],
      ['106752d', 'exceeds ES max days (106751)'],
      ['9223286401s', 'exceeds ES max seconds (9223286400)'],
    ];

    invalidDurations.forEach(([value, description]) => {
      it(`rejects invalid duration: ${description} ("${value}")`, () => {
        expect(() => validate(value)).toThrow('Expiration must be a valid duration (for example');
      });
    });

    it('rejects values exceeding maxLength of 20 characters', () => {
      expect(() => validate('1'.repeat(20) + 'd')).toThrow();
    });
  });
});
