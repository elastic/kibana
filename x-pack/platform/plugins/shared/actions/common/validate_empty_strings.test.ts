/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEmptyStrings } from './validate_empty_strings';

describe('validateEmptyStrings', () => {
  const action = {
    name: 'my name',
    actionTypeId: 'my-action-type',
    config: {
      param1: ' ',
    },
    secrets: {
      param1: [' ', 'param1'],
    },
  };

  it('should not throw an error if the trimmed string is not empty', () => {
    expect(() => validateEmptyStrings(action.name)).not.toThrow();
  });

  it('should throw an error if the trimmed strings in an array are empty', () => {
    expect(() => validateEmptyStrings(action.secrets)).toThrowErrorMatchingInlineSnapshot(
      `"value '' is not valid"`
    );
  });

  it('should throw an error if the trimmed strings in an object are empty', () => {
    expect(() => validateEmptyStrings(action)).toThrowErrorMatchingInlineSnapshot(
      `"value '' is not valid"`
    );
  });
});
