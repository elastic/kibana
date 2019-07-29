/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { generateTablePaginationOptions } from './helpers';

describe('generateTablePaginationOptions pagination helper function', () => {
  let activePage;
  let limit;
  test('generates 5 pages when activePage 0', () => {
    activePage = 0;
    limit = 10;
    const result = generateTablePaginationOptions(activePage, limit);
    expect(result).toEqual({
      activePage,
      cursorStart: 0,
      fakePossibleCount: 50,
      querySize: 10,
    });
  });
  test('generates 6 pages when activePage 4', () => {
    activePage = 4;
    limit = 10;
    const result = generateTablePaginationOptions(activePage, limit);
    expect(result).toEqual({
      activePage,
      cursorStart: 40,
      fakePossibleCount: 60,
      querySize: 50,
    });
  });
  test('generates 5 pages when activePage 2', () => {
    activePage = 2;
    limit = 10;
    const result = generateTablePaginationOptions(activePage, limit);
    expect(result).toEqual({
      activePage,
      cursorStart: 20,
      fakePossibleCount: 50,
      querySize: 30,
    });
  });
});
