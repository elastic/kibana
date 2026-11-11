/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useStreamsAppRouter } from './use_streams_app_router';
import { useStreamsPrivileges } from './use_streams_privileges';
import { useTimeRange } from './use_time_range';

/** Unit id of the open Classic tab, so a stream page can link back to that unit. */
export const CLASSIC_TAB_ORIGIN_KEY = 'streams.classicTabOrigin';

/** Remembers the unit whose Classic tab is open. An empty value clears it. Blocked storage fails open, back to `/`. */
export function rememberClassicTabOrigin(unitId?: string): void {
  try {
    if (unitId) {
      sessionStorage.setItem(CLASSIC_TAB_ORIGIN_KEY, unitId);
    } else {
      sessionStorage.removeItem(CLASSIC_TAB_ORIGIN_KEY);
    }
  } catch {
    // Private mode and blocked storage have no return target, so Streams goes back to `/`.
  }
}

function readClassicTabUnitId(): string | undefined {
  try {
    return sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function useClassicTabUnitId(): () => string | undefined {
  const {
    access: { legacy, v2 },
  } = useStreamsPrivileges();

  // Read at call time: the stored unit changes when the layout tab changes, not when this hook renders.
  return useCallback(() => (legacy && v2 ? readClassicTabUnitId() : undefined), [legacy, v2]);
}

/** Link back to the streams list: the Classic tab of the unit it was opened from, `/` otherwise. */
export function useStreamsHomeLink(): string {
  const router = useStreamsAppRouter();
  const classicTabUnitId = useClassicTabUnitId();
  const { rangeFrom, rangeTo } = useTimeRange();
  const unitId = classicTabUnitId();

  // `/` takes no params here, DateRangeRedirect adds the range.
  return unitId
    ? router.link('/v2/unit/{unitId}/{tab}', {
        path: { unitId, tab: 'classic' },
        query: { rangeFrom, rangeTo },
      })
    : router.link('/');
}

/** Navigates to the same place as {@link useStreamsHomeLink}, e.g. after deleting the stream. */
export function useNavigateToStreamsHome(): () => void {
  const router = useStreamsAppRouter();
  const classicTabUnitId = useClassicTabUnitId();
  const { rangeFrom, rangeTo } = useTimeRange();

  return useCallback(() => {
    const unitId = classicTabUnitId();
    const query = { rangeFrom, rangeTo };
    if (unitId) {
      router.push('/v2/unit/{unitId}/{tab}', { path: { unitId, tab: 'classic' }, query });
    } else {
      router.push('/', { path: {}, query });
    }
  }, [router, classicTabUnitId, rangeFrom, rangeTo]);
}
