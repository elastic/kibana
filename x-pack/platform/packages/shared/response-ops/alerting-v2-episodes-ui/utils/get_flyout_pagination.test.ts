/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFlyoutPagination } from './get_flyout_pagination';

const record = (id: string): DataTableRecord => ({ id, raw: {}, flattened: {} });

describe('getFlyoutPagination', () => {
  const rows = [record('a'), record('b'), record('c')];

  it('reports the position of the current row', () => {
    const pagination = getFlyoutPagination(rows, 'b', jest.fn());

    expect(pagination).toEqual(expect.objectContaining({ currentIndex: 1, total: 3 }));
  });

  it('selects the neighbouring rows on previous and next', () => {
    const onSelect = jest.fn();
    const pagination = getFlyoutPagination(rows, 'b', onSelect);

    pagination?.onPrevious();
    expect(onSelect).toHaveBeenLastCalledWith(rows[0]);

    pagination?.onNext();
    expect(onSelect).toHaveBeenLastCalledWith(rows[2]);
  });

  it('reports the first and last positions', () => {
    expect(getFlyoutPagination(rows, 'a', jest.fn())?.currentIndex).toBe(0);
    expect(getFlyoutPagination(rows, 'c', jest.fn())?.currentIndex).toBe(2);
  });

  it('follows the order of the rows it is given', () => {
    const onSelect = jest.fn();
    const reversed = [...rows].reverse();
    const pagination = getFlyoutPagination(reversed, 'c', onSelect);

    expect(pagination?.currentIndex).toBe(0);
    pagination?.onNext();
    expect(onSelect).toHaveBeenLastCalledWith(rows[1]);
  });

  it('returns undefined when there is a single row', () => {
    expect(getFlyoutPagination([record('a')], 'a', jest.fn())).toBeUndefined();
  });

  it('returns undefined when the current row is not displayed', () => {
    expect(getFlyoutPagination(rows, 'missing', jest.fn())).toBeUndefined();
  });
});
