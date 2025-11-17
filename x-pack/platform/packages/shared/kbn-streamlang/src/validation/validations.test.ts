/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamlangDSL } from '../../types/streamlang';
import { validateStreamlang, StreamlangValidationError } from './validations';

describe('validateStreamlang', () => {
  it('returns true for a valid DSL', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'field',
          value: 'value',
        },
      ],
    };

    expect(validateStreamlang(dsl)).toBe(true);
  });

  it('throws StreamlangValidationError when schema validation fails', () => {
    const invalidDsl = { foo: 'bar' };

    expect(() => validateStreamlang(invalidDsl as any)).toThrow(StreamlangValidationError);
  });

  it('throws StreamlangValidationError for invalid field names', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'field[invalid]',
          value: 'value',
        },
      ],
    };

    expect(() => validateStreamlang(dsl)).toThrow(StreamlangValidationError);
  });

  it('throws StreamlangValidationError when convert processor inside where clause lacks target field', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          where: {
            field: 'status',
            eq: 'active',
            steps: [
              {
                action: 'convert',
                from: 'source',
                type: 'integer',
              },
            ],
          },
        },
      ],
    };

    expect(() => validateStreamlang(dsl)).toThrow(StreamlangValidationError);
  });

  it('throws StreamlangValidationError when remove_by_prefix is used in a where block', () => {
    const dsl: StreamlangDSL = {
      steps: [
        {
          where: {
            field: 'status',
            eq: 'active',
            steps: [
              {
                action: 'remove_by_prefix',
                from: 'temp',
              },
            ],
          },
        },
      ],
    };

    expect(() => validateStreamlang(dsl)).toThrow(StreamlangValidationError);
  });
});
