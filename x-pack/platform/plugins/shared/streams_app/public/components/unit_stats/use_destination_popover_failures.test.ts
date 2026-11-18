/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { EMPTY_DESTINATION_FAILED } from '../../services/unit_stats_client/map_stats_response';
import { useDestinationPopoverFailures } from './use_destination_popover_failures';

const mockUseDestinationFailures = jest.fn();
jest.mock('./use_destination_failures', () => ({
  useDestinationFailures: (...args: unknown[]) => mockUseDestinationFailures(...args),
}));

const failed = {
  ...EMPTY_DESTINATION_FAILED,
  authentication: { rate: 0.5, unit: '{item}', percentage: 11.9, breakdown: [] },
};
const loaded = { value: { status: 'ready', stats: { failed } } };
const notLoaded = { value: undefined };

const renderPopoverHook = (isOpen: boolean) =>
  renderHook(({ open }) => useDestinationPopoverFailures('es-dev', open), {
    initialProps: { open: isOpen },
  });

describe('useDestinationPopoverFailures', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseDestinationFailures.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('asks for the destination over the window of the Map, only while the popover is open', () => {
    mockUseDestinationFailures.mockReturnValue(notLoaded);
    const { rerender } = renderPopoverHook(false);

    expect(mockUseDestinationFailures).toHaveBeenLastCalledWith('es-dev', {
      range: 'default',
      enabled: false,
    });

    rerender({ open: true });
    expect(mockUseDestinationFailures).toHaveBeenLastCalledWith('es-dev', {
      range: 'default',
      enabled: true,
    });
  });

  it('gives the failures of the destination', () => {
    mockUseDestinationFailures.mockReturnValue(loaded);

    const { result } = renderPopoverHook(true);

    expect(result.current).toBe(failed);
  });

  it('is undefined until the first result arrives', () => {
    mockUseDestinationFailures.mockReturnValue(notLoaded);

    const { result } = renderPopoverHook(true);

    expect(result.current).toBeUndefined();
  });

  it('keeps showing the last failures when the popover closes and reopens, until the next arrive', () => {
    mockUseDestinationFailures.mockReturnValue(loaded);
    const { result, rerender } = renderPopoverHook(true);
    expect(result.current).toBe(failed);

    // Closed, the base hook has no value, and the last one stays.
    mockUseDestinationFailures.mockReturnValue(notLoaded);
    rerender({ open: false });
    expect(result.current).toBe(failed);

    rerender({ open: true });
    expect(result.current).toBe(failed);
  });

  it('drops the last failures once they are too old to show', () => {
    mockUseDestinationFailures.mockReturnValue(loaded);
    const { result, rerender } = renderPopoverHook(true);

    mockUseDestinationFailures.mockReturnValue(notLoaded);
    jest.advanceTimersByTime(5 * 60_000);
    rerender({ open: false });

    expect(result.current).toBeUndefined();
  });
});
