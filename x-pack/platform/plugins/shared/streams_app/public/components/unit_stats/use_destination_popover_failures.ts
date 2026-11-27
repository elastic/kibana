/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLastValue } from '../../hooks/use_last_value';
import type { DestinationFailedView } from '../../services/unit_stats_client/types';
import { useDestinationFailures } from './use_destination_failures';

/** The last failures of a destination are shown while the next ones load, for this long at most. */
const MAX_STALE_MS = 5 * 60_000;

/**
 * The failures of a destination, with their series, for the popover of the Map. It asks when the
 * popover opens, over the window that the Map uses, and not again while it stays open. Closing it
 * aborts a request in flight.
 *
 * The last result shows while the next one loads, so reopening the popover has its sparklines at
 * once. It is `undefined` until the first result arrives, and when the destination has none: a
 * failure to load is not worth a message here, and the rest of the popover does not depend on it.
 */
export const useDestinationPopoverFailures = (
  destinationId: string,
  isOpen: boolean
): DestinationFailedView | undefined => {
  const { value } = useDestinationFailures(destinationId, { range: 'default', enabled: isOpen });

  return useLastValue(value?.stats.failed, { maxAgeMs: MAX_STALE_MS });
};
