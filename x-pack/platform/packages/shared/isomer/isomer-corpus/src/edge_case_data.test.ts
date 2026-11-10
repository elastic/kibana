/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EDGE_CASE_CATEGORIES,
  EDGE_CASE_TIME_FIELD,
  EDGE_CASE_TIME_RANGE,
  buildEdgeCaseDocuments,
} from './edge_case_data';

describe('buildEdgeCaseDocuments', () => {
  const documents = buildEdgeCaseDocuments();

  it('is deterministic', () => {
    expect(buildEdgeCaseDocuments()).toEqual(documents);
  });

  it('stays inside the pinned time range', () => {
    const times = documents.map((document) => Date.parse(document[EDGE_CASE_TIME_FIELD]));
    expect(Math.min(...times)).toBeGreaterThanOrEqual(Date.parse(EDGE_CASE_TIME_RANGE.from));
    expect(Math.max(...times)).toBeLessThan(Date.parse(EDGE_CASE_TIME_RANGE.to));
  });

  it('holds null, negative, huge and tiny values', () => {
    expect(documents.some(({ value }) => value === null)).toBe(true);
    expect(documents.some(({ signed }) => signed < 0)).toBe(true);
    expect(documents.some(({ signed }) => signed > 0)).toBe(true);
    expect(Math.max(...documents.map(({ huge }) => huge))).toBeGreaterThanOrEqual(1e18);
    expect(Math.max(...documents.map(({ tiny }) => tiny))).toBeLessThan(1e-8);
  });

  it('has a missing bucket and more categories than the top-5 limit', () => {
    expect(documents.some(({ category }) => category === undefined)).toBe(true);
    const categories = new Set(documents.map(({ category }) => category).filter(Boolean));
    expect(categories.size).toBe(EDGE_CASE_CATEGORIES.length);
  });

  it('has multivalue and missing tags', () => {
    expect(documents.some(({ tags }) => (tags?.length ?? 0) > 1)).toBe(true);
    expect(documents.some(({ tags }) => tags === undefined)).toBe(true);
  });
});
