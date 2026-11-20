/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { verdictPairingKey } from './verdict_pairing_key';

describe('verdictPairingKey', () => {
  const base = { suiteId: 's', exampleId: 'e', repetition: 0, evaluator: 'Correctness' };

  it('is stable for identical identities', () => {
    expect(verdictPairingKey(base)).toBe(verdictPairingKey({ ...base }));
  });

  it.each([
    ['suite', { suiteId: 'other' }],
    ['example', { exampleId: 'other' }],
    ['repetition', { repetition: 1 }],
    ['evaluator', { evaluator: 'Other' }],
  ])('differs when the %s differs', (_, override) => {
    expect(verdictPairingKey({ ...base, ...override })).not.toBe(verdictPairingKey(base));
  });

  it('does not let adjacent fields run together', () => {
    expect(verdictPairingKey({ ...base, exampleId: 'a', evaluator: 'bc' })).not.toBe(
      verdictPairingKey({ ...base, exampleId: 'ab', evaluator: 'c' })
    );
  });

  it('treats a missing suite like an empty one', () => {
    expect(verdictPairingKey({ ...base, suiteId: undefined })).toBe(
      verdictPairingKey({ ...base, suiteId: '' })
    );
  });
});
