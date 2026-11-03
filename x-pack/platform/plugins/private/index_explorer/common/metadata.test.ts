/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findIndexMetadata } from './metadata';
import type { IndexMetadata } from './types';

function metadata(title: string): IndexMetadata {
  return { title, facets: [], columns: [] };
}

describe('findIndexMetadata', () => {
  const indices = {
    'logs-*': metadata('pattern'),
    'logs-app': metadata('exact'),
    'a.b+c': metadata('special'),
  };

  it('prefers an exact match over a pattern', () => {
    expect(findIndexMetadata('logs-app', indices)?.title).toBe('exact');
  });

  it('matches `*` patterns', () => {
    expect(findIndexMetadata('logs-other', indices)?.title).toBe('pattern');
  });

  it('treats regular expression characters literally', () => {
    expect(findIndexMetadata('a.b+c', indices)?.title).toBe('special');
    expect(findIndexMetadata('axb+c', indices)).toBeUndefined();
  });

  it('returns undefined when nothing matches', () => {
    expect(findIndexMetadata('metrics', indices)).toBeUndefined();
  });
});
