/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readReturnParams } from './read_return_params';

describe('readReturnParams', () => {
  it('returns both params when they are present', () => {
    expect(readReturnParams('?returnAppId=observabilityOnboarding&returnPath=%3F')).toEqual({
      returnAppId: 'observabilityOnboarding',
      returnPath: '?',
    });
  });

  it('returns undefined when search is empty', () => {
    expect(readReturnParams('')).toBeUndefined();
  });

  it('returns undefined when only one param is present', () => {
    expect(readReturnParams('?returnAppId=observabilityOnboarding')).toBeUndefined();
  });
});
