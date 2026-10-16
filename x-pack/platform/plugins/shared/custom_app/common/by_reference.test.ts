/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isByReferenceState } from './by_reference';

describe('isByReferenceState', () => {
  it('is true for a state that names an app of the library', () => {
    expect(isByReferenceState({ ref_id: 'app-1', title: 'Mine' })).toBe(true);
  });

  it('is false for an app of the panel itself, whatever it holds', () => {
    expect(isByReferenceState({ version: 1, document: {} })).toBe(false);
  });

  it('is false when the id is not a text, rather than treating a broken state as a link', () => {
    expect(isByReferenceState({ ref_id: 7 })).toBe(false);
    expect(isByReferenceState({ ref_id: undefined })).toBe(false);
  });
});
