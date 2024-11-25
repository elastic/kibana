/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { numberValidator } from './validate_number';

describe('numberValidator', () => {
  it('should allow an empty value if not required', () => {
    const validator = numberValidator({ min: 1, integerOnly: true, required: false });
    expect(validator(undefined)).toStrictEqual(null);
  });

  it('should not allow an empty value if required', () => {
    const validator = numberValidator({ min: 1, integerOnly: true, required: true });
    expect(validator(undefined)).toStrictEqual({ required: true });
  });

  it('should only allow integers above zero', () => {
    const integerOnlyValidator = numberValidator({ min: 1, integerOnly: true });
    // invalid
    expect(integerOnlyValidator(0)).toMatchObject({ min: true });
    expect(integerOnlyValidator(0.1)).toMatchObject({ integerOnly: true });

    // valid
    expect(integerOnlyValidator(1)).toStrictEqual(null);
    expect(integerOnlyValidator(100)).toStrictEqual(null);
  });

  it('should not allow value greater than max', () => {
    const integerOnlyValidator = numberValidator({ min: 1, max: 8, integerOnly: true });
    // invalid
    expect(integerOnlyValidator(10)).toMatchObject({ max: true });
    expect(integerOnlyValidator(11.1)).toMatchObject({ integerOnly: true, max: true });

    // valid
    expect(integerOnlyValidator(6)).toStrictEqual(null);
  });

  it('should allow non-integers', () => {
    const integerOnlyValidator = numberValidator({ min: 1, max: 8, integerOnly: false });
    // invalid
    expect(integerOnlyValidator(10)).toMatchObject({ max: true });
    expect(integerOnlyValidator(11.1)).toMatchObject({ max: true });

    // valid
    expect(integerOnlyValidator(6)).toStrictEqual(null);
    expect(integerOnlyValidator(6.6)).toStrictEqual(null);
  });
});
