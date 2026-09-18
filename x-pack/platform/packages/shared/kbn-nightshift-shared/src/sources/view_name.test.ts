/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getNightshiftSourceViewName,
  getSourceSlugCandidate,
  getSourceSlugFromTitle,
} from './view_name';

describe('getNightshiftSourceViewName', () => {
  it('puts the slug after the Nightshift sources prefix', () => {
    expect(getNightshiftSourceViewName('nginx-errors')).toBe('$.nightshift.sources.nginx-errors');
  });
});

describe('getSourceSlugFromTitle', () => {
  it('kebabs a readable title', () => {
    expect(getSourceSlugFromTitle('Nginx errors')).toBe('nginx-errors');
    expect(getSourceSlugFromTitle('  Prod app logs! ')).toBe('prod-app-logs');
  });

  it('falls back when the title slugifies to nothing', () => {
    expect(getSourceSlugFromTitle('!!!')).toBe('source');
    expect(getSourceSlugFromTitle('日本語')).toBe('source');
  });
});

describe('getSourceSlugCandidate', () => {
  it('is the title slug on the first attempt', () => {
    expect(getSourceSlugCandidate('Nginx errors', 1)).toBe('nginx-errors');
  });

  it('appends a 1-based suffix when the first name is taken', () => {
    expect(getSourceSlugCandidate('Nginx errors', 2)).toBe('nginx-errors-2');
    expect(getSourceSlugCandidate('Nginx errors', 3)).toBe('nginx-errors-3');
  });
});
