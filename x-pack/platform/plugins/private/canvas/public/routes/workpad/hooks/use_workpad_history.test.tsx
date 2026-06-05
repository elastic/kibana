/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useWorkpadHistory } from './use_workpad_history';
import { encode } from '../route_state';

const mockPush = jest.fn();
const mockReplace = jest.fn();

let mockPersistentState: any;
let mockLocationState: string | undefined;

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector({ persistent: mockPersistentState }),
}));

jest.mock('react-router-dom', () => ({
  useHistory: () => ({
    action: 'PUSH',
    push: mockPush,
    replace: mockReplace,
    location: {
      pathname: '/workpad/workpad-1/page/1',
      search: '',
      hash: '',
      state: mockLocationState,
    },
  }),
}));

describe('useWorkpadHistory', () => {
  const baseWorkpad = {
    id: 'workpad-1',
    name: 'A',
    page: 0,
    pages: [],
    '@timestamp': '2021-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPersistentState = { schemaVersion: 1, workpad: { ...baseWorkpad } };
    mockLocationState = encode(mockPersistentState);
  });

  test('replaces the route with the current state when the location has no state', () => {
    mockLocationState = undefined;

    renderHook(useWorkpadHistory);

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('pushes a history entry when workpad content changes', () => {
    const { rerender } = renderHook(useWorkpadHistory);

    // A content edit (the location state still reflects the previous name).
    mockPersistentState = { schemaVersion: 1, workpad: { ...baseWorkpad, name: 'B' } };
    rerender();

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test('does not push a history entry when only @timestamp changes', () => {
    const { rerender } = renderHook(useWorkpadHistory);

    // A timestamp-only change, e.g. the value synced back into state after a save.
    mockPersistentState = {
      schemaVersion: 1,
      workpad: { ...baseWorkpad, '@timestamp': '2021-01-01T00:05:00.000Z' },
    };
    rerender();

    expect(mockPush).not.toHaveBeenCalled();
  });
});
