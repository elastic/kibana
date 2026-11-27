/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { CanvasFlyoutKind } from './state_management/types';

interface CloseRemovedDestinationFlyoutArgs {
  flyoutName: string | null;
  flyoutKind: CanvasFlyoutKind | null;
  destinationIds: readonly string[];
  closeFlyout: () => void;
}

export const useCloseRemovedDestinationFlyout = ({
  flyoutName,
  flyoutKind,
  destinationIds,
  closeFlyout,
}: CloseRemovedDestinationFlyoutArgs): CanvasFlyoutKind | null => {
  const previousDestinationIds = useRef(destinationIds);
  const hasDestination = flyoutName !== null && destinationIds.includes(flyoutName);
  const shouldClose =
    flyoutKind !== 'index' &&
    flyoutName !== null &&
    !hasDestination &&
    previousDestinationIds.current.includes(flyoutName);

  useEffect(() => {
    previousDestinationIds.current = destinationIds;

    if (shouldClose) {
      closeFlyout();
    }
  }, [closeFlyout, destinationIds, shouldClose]);

  // A removed legacy destination would otherwise render as an index before the URL closes.
  if (!flyoutName || shouldClose) {
    return null;
  }
  return flyoutKind ?? (hasDestination ? 'destination' : 'index');
};
