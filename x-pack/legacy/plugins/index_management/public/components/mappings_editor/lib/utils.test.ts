/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../constants', () => ({ DATA_TYPE_DEFINITION: {} }));

import { determineIfValid } from '.';

describe('Mappings Editor form validity', () => {
  let components: any;
  it('handles base case', () => {
    components = {
      fieldsJsonEditor: { isValid: undefined },
      configuration: { isValid: undefined },
      fieldForm: undefined,
    };
    expect(determineIfValid(components)).toBe(undefined);
  });

  it('handles combinations of true, false and undefined', () => {
    components = {
      fieldsJsonEditor: { isValid: false },
      configuration: { isValid: true },
      fieldForm: undefined,
    };

    expect(determineIfValid(components)).toBe(false);

    components = {
      fieldsJsonEditor: { isValid: false },
      configuration: { isValid: undefined },
      fieldForm: undefined,
    };

    expect(determineIfValid(components)).toBe(undefined);

    components = {
      fieldsJsonEditor: { isValid: true },
      configuration: { isValid: undefined },
      fieldForm: undefined,
    };

    expect(determineIfValid(components)).toBe(undefined);

    components = {
      fieldsJsonEditor: { isValid: true },
      configuration: { isValid: false },
      fieldForm: undefined,
    };

    expect(determineIfValid(components)).toBe(false);

    components = {
      fieldsJsonEditor: { isValid: false },
      configuration: { isValid: true },
      fieldForm: { isValid: true },
    };

    expect(determineIfValid(components)).toBe(false);
  });
});
