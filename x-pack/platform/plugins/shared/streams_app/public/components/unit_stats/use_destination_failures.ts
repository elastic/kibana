/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibana } from '../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../hooks/use_streams_app_fetch';
import { useUnitId } from '../../hooks/use_unit_id';
import { createUnitStatsClient } from '../../services/unit_stats_client/unit_stats_client';

/**
 * The stats of one destination, with its delivery series, for the flyout and the popover of the Map.
 * It does not use the stats manager of the Map, which holds one window and keys by id, so it cannot
 * serve a window of its own.
 *
 * `range` is `picker`, the range of the time picker, unless told to use `default`, the window that
 * the Map uses. It asks again when the range changes and when the page is refreshed. With `enabled`
 * false it makes no request, and its value is `undefined`.
 *
 * The value is the mapped stats of the destination: its status and its values, and an error next to
 * them when only part could be read. A request that fails as a whole is the `error` of the state,
 * and shows in the section, so it raises no toast.
 */
export const useDestinationFailures = (
  destinationId: string,
  { range = 'picker', enabled = true }: { range?: 'picker' | 'default'; enabled?: boolean } = {}
) => {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const unitId = useUnitId();
  const client = useMemo(
    () => createUnitStatsClient({ streamsRepositoryClient, unitId }),
    [streamsRepositoryClient, unitId]
  );

  return useStreamsAppFetch(
    async ({ signal, timeState }) => {
      if (!enabled) return undefined;

      const { destinations } = await client.fetchStats(
        {
          components: [
            { kind: 'destination', id: destinationId, include: { delivery_series: true } },
          ],
          window:
            range === 'default'
              ? { kind: 'default' }
              : {
                  kind: 'range',
                  start: new Date(timeState.start).toISOString(),
                  end: new Date(timeState.end).toISOString(),
                },
        },
        { signal }
      );
      // An id is user-defined, so `constructor` must not be read from `Object.prototype`.
      return Object.hasOwn(destinations, destinationId) ? destinations[destinationId] : undefined;
    },
    [client, destinationId, range, enabled],
    { withTimeRange: true, withRefresh: true, disableToastOnError: true }
  );
};
