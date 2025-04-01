/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isLegacySemanticTextVersion } from './manifest_versions';

describe('isLegacySemanticTextVersion', () => {
  it('returns true for version 1.0.0', () => {
    expect(isLegacySemanticTextVersion('1.0.0')).toBe(true);
  });

  it('returns false for version 2.0.0 and higher', () => {
    expect(isLegacySemanticTextVersion('2.0.0')).toBe(false);
    expect(isLegacySemanticTextVersion('4.92.3')).toBe(false);
  });
});
