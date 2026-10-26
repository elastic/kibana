/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import { getShowsEstimates, setShowsEstimates, useShowsEstimates } from './estimates_setting';

beforeEach(() => {
  window.localStorage.clear();
});

describe('estimates setting', () => {
  it('hides estimates until a tester turns them on, and keeps their choice in the browser', () => {
    expect(getShowsEstimates()).toBe(false);

    setShowsEstimates(true);
    expect(getShowsEstimates()).toBe(true);
    expect(window.localStorage.getItem('xpack.boost.prototype.showsEstimates')).toBe('true');

    setShowsEstimates(false);
    expect(getShowsEstimates()).toBe(false);
  });

  it('updates what follows it when the setting changes', () => {
    const { result } = renderHook(() => useShowsEstimates());
    expect(result.current).toBe(false);

    act(() => setShowsEstimates(true));
    expect(result.current).toBe(true);
  });
});
