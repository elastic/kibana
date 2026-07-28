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
      '500ms',
      '100micros',
      '50nanos',
      '0d',
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
    ];

    invalidDurations.forEach(([value, description]) => {
      it(`rejects invalid duration: ${description} ("${value}")`, () => {
        expect(() => validate(value)).toThrow('expiration must be a valid Elasticsearch duration');
      });
    });
  });
});
