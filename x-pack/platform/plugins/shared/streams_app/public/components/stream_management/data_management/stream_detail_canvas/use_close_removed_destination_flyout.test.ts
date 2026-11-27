/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { CanvasFlyoutKind } from './state_management/types';
import { useCloseRemovedDestinationFlyout } from './use_close_removed_destination_flyout';

describe('useCloseRemovedDestinationFlyout', () => {
  const renderFlyout = (flyoutKind: CanvasFlyoutKind | null, destinationIds: readonly string[]) => {
    const closeFlyout = jest.fn();
    const initialProps = { flyoutName: 'es', flyoutKind, destinationIds, closeFlyout };
    const { result, rerender } = renderHook(useCloseRemovedDestinationFlyout, { initialProps });
    return {
      closeFlyout,
      result,
      rerenderWithDestinations: (ids: readonly string[]) =>
        rerender({ ...initialProps, destinationIds: ids }),
    };
  };

  it('keeps a deep-linked flyout open while the unit loads', () => {
    const { closeFlyout, rerenderWithDestinations } = renderFlyout('destination', []);

    rerenderWithDestinations([]);
    rerenderWithDestinations(['es']);

    expect(closeFlyout).not.toHaveBeenCalled();
  });

  it('suppresses index inspection when a legacy destination link is closing', () => {
    const { closeFlyout, result, rerenderWithDestinations } = renderFlyout(null, ['es']);
    expect(result.current).toBe('destination');

    rerenderWithDestinations([]);

    expect(result.current).toBeNull();
    expect(closeFlyout).toHaveBeenCalledTimes(1);
  });

  it('keeps an explicit index flyout open when a same-name destination is removed', () => {
    const { closeFlyout, result, rerenderWithDestinations } = renderFlyout('index', ['es']);
    expect(result.current).toBe('index');

    rerenderWithDestinations([]);

    expect(result.current).toBe('index');
    expect(closeFlyout).not.toHaveBeenCalled();
  });
});
