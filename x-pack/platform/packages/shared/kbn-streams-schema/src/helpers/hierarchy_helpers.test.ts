/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isValidRoutingOrder } from './hierarchy_helpers';

describe('isValidRoutingOrder', () => {
  it('returns true for an empty routing list', () => {
    expect(isValidRoutingOrder([])).toBe(true);
  });

  it('returns true for a single materialized entry', () => {
    expect(isValidRoutingOrder([{ draft: false }])).toBe(true);
  });

  it('returns true for a single draft entry', () => {
    expect(isValidRoutingOrder([{ draft: true }])).toBe(true);
  });

  it('returns true when every entry is materialized', () => {
    expect(isValidRoutingOrder([{ draft: false }, { draft: false }, { draft: false }])).toBe(true);
  });

  it('returns true when every entry is a draft', () => {
    expect(isValidRoutingOrder([{ draft: true }, { draft: true }])).toBe(true);
  });

  it('returns true when drafts are contiguous at the end', () => {
    expect(
      isValidRoutingOrder([{ draft: false }, { draft: false }, { draft: true }, { draft: true }])
    ).toBe(true);
  });

  it('returns false when a materialized entry follows a draft', () => {
    expect(isValidRoutingOrder([{ draft: true }, { draft: false }])).toBe(false);
  });

  it('returns false when a materialized entry is sandwiched between drafts', () => {
    expect(isValidRoutingOrder([{ draft: false }, { draft: true }, { draft: false }])).toBe(false);
  });

  // `draft` is optional on RoutingDefinition; an omitted flag must behave like a materialized entry.
  it('treats a missing draft flag as materialized (valid before a draft)', () => {
    expect(isValidRoutingOrder([{}, { draft: true }])).toBe(true);
  });

  it('treats a missing draft flag as materialized (invalid after a draft)', () => {
    expect(isValidRoutingOrder([{ draft: true }, {}])).toBe(false);
  });
});
