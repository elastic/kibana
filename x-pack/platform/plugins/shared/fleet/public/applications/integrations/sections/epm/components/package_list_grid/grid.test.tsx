/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { CellMeasurerCache } from 'react-virtualized';

import type { IntegrationCardItem } from '../../screens/home';

import { GridColumn } from './grid';

let mockOnResize: ((size: { width: number; height: number }) => void) | undefined;
const mockRecomputeRowHeights = jest.fn();

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiAutoSizer: ({
    children,
    onResize,
  }: {
    children: (size: { width: number; height: number }) => React.ReactNode;
    onResize: (size: { width: number; height: number }) => void;
  }) => {
    mockOnResize = onResize;
    return children({ width: 1200, height: 0 });
  },
}));

jest.mock('react-virtualized', () => {
  const actual = jest.requireActual('react-virtualized');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');

  return {
    ...actual,
    List: forwardRef((_props: unknown, ref: unknown) => {
      useImperativeHandle(ref, () => ({
        recomputeRowHeights: mockRecomputeRowHeights,
        forceUpdateGrid: jest.fn(),
      }));
      return null;
    }),
  };
});

const makeItem = (id: string) =>
  ({
    id,
    name: id,
    title: id,
    description: '',
    categories: [],
    icons: [],
    url: '',
    version: '',
    integration: id,
  } as IntegrationCardItem);

describe('GridColumn', () => {
  beforeEach(() => {
    mockOnResize = undefined;
    mockRecomputeRowHeights.mockClear();
  });

  it('recomputes row heights when the grid is resized without changing the column count', () => {
    const clearAll = jest.spyOn(CellMeasurerCache.prototype, 'clearAll');

    render(
      <GridColumn
        list={[makeItem('a'), makeItem('b'), makeItem('c'), makeItem('d')]}
        isLoading={false}
        columnCount={3}
      />
    );

    clearAll.mockClear();
    mockRecomputeRowHeights.mockClear();

    mockOnResize?.({ width: 800, height: 0 });

    expect(clearAll).toHaveBeenCalledTimes(1);
    expect(mockRecomputeRowHeights).toHaveBeenCalledTimes(1);
    expect(mockRecomputeRowHeights).toHaveBeenCalledWith(0);

    clearAll.mockRestore();
  });
});
