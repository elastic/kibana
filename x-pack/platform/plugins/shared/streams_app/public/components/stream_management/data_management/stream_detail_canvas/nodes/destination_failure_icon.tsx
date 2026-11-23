/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { DestinationFailedView } from '../../../../../services/unit_stats_client/types';
import { hasDestinationFailures } from '../../../../streams_layout/destinations/destination_failures';
import { useDestinationPopoverFailures } from '../../../../unit_stats/use_destination_popover_failures';
import { DestinationFailurePopover } from './destination_failure_popover';

/**
 * The failure badge of a destination on the Map, with the data of its popover. It asks for the
 * series of the sparklines when the popover opens, and the same response has the rates, so once it
 * arrives the popover shows one self-consistent result. A result with no failures, because they
 * stopped since the Map last loaded, would leave the popover empty, so the Map's values stay then.
 *
 * It is a different problem from `StatsProblemIcon`: those say that the stats could not be loaded,
 * and this one says that the stats are loaded and show failures.
 */
export const DestinationFailureIcon = ({
  destinationId,
  failed,
  dataTestSubj,
}: {
  destinationId: string;
  /** What the Map has loaded for the destination, shown until the popover has its own. */
  failed: DestinationFailedView;
  dataTestSubj: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const fetched = useDestinationPopoverFailures(destinationId, isOpen);

  return (
    <DestinationFailurePopover
      failed={fetched && hasDestinationFailures(fetched) ? fetched : failed}
      onOpenChange={setIsOpen}
      dataTestSubj={dataTestSubj}
    />
  );
};
