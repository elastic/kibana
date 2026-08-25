/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { either } from 'fp-ts';
import { booleanFromStringRT } from './query_string_boolean';

describe('BooleanFromString runtime type', () => {
  it('decodes string "true" to a boolean', () => {
    expect(booleanFromStringRT.decode('true')).toEqual(either.right(true));
  });

  it('decodes string "false" to a boolean', () => {
    expect(booleanFromStringRT.decode('false')).toEqual(either.right(false));
  });

  it('rejects other strings', () => {
    expect(either.isLeft(booleanFromStringRT.decode('maybe'))).toBeTruthy();
  });
});
