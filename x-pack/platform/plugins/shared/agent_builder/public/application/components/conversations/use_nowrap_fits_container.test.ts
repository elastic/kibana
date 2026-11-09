/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useNowrapFitsContainer } from './use_nowrap_fits_container';

const createElementWithWidths = ({
  clientWidth,
  scrollWidth,
}: {
  clientWidth: number;
  scrollWidth: number;
}): HTMLElement => {
  const element = document.createElement('div');
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth });
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth });
  return element;
};

describe('useNowrapFitsContainer', () => {
  it('returns true when the nowrap sizer fits in the container', () => {
    const container = createElementWithWidths({ clientWidth: 500, scrollWidth: 500 });
    const sizer = createElementWithWidths({ clientWidth: 400, scrollWidth: 400 });

    const { result } = renderHook(() => useNowrapFitsContainer(container, sizer));

    expect(result.current).toBe(true);
  });

  it('returns false when the nowrap sizer is wider than the container', () => {
    const container = createElementWithWidths({ clientWidth: 320, scrollWidth: 320 });
    const sizer = createElementWithWidths({ clientWidth: 320, scrollWidth: 640 });

    const { result } = renderHook(() => useNowrapFitsContainer(container, sizer));

    expect(result.current).toBe(false);
  });

  it('returns true when either element is missing', () => {
    const { result } = renderHook(() => useNowrapFitsContainer(null, null));

    expect(result.current).toBe(true);
  });
});
