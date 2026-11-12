/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getObservableDedupeKey } from './get_observable_dedupe_key';

describe('getObservableDedupeKey', () => {
  it('returns the same key for the same type key and value', () => {
    expect(getObservableDedupeKey('foo', 'bar')).toBe(getObservableDedupeKey('foo', 'bar'));
  });

  it('returns different keys when a hyphen moves between the type key and the value', () => {
    expect(getObservableDedupeKey('foo', 'bar-1')).not.toBe(getObservableDedupeKey('foo-bar', '1'));
  });
});
