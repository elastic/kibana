/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';
import { useTimeRange } from '../../hooks/use_time_range';

// Session storage, so a reload on the stream page still links back to the Classic tab.
export const CLASSIC_TAB_ORIGIN_KEY = 'streams.classicTabOrigin';

export const rememberClassicTabOrigin = (isClassicTab: boolean): void => {
  try {
    if (isClassicTab) {
      sessionStorage.setItem(CLASSIC_TAB_ORIGIN_KEY, 'true');
    } else {
      sessionStorage.removeItem(CLASSIC_TAB_ORIGIN_KEY);
    }
  } catch {
    // Blocked storage only costs the way back to the Classic tab.
  }
};

const isClassicTabOrigin = (): boolean => {
  try {
    return sessionStorage.getItem(CLASSIC_TAB_ORIGIN_KEY) === 'true';
  } catch {
    return false;
  }
};

const CLASSIC_TAB_PARAMS = { path: { unitId: STREAMS_DEFAULT_UNIT_ID, tab: 'classic' } };

function useReturnsToClassicTab(): () => boolean {
  const {
    access: { legacy, v2 },
  } = useStreamsPrivileges();
  return useCallback(() => legacy && v2 && isClassicTabOrigin(), [legacy, v2]);
}

/** Link back to the streams list: the Classic tab when the stream was opened from it, `/` otherwise. */
export function useStreamsListLink(): string {
  const router = useStreamsAppRouter();
  const returnsToClassicTab = useReturnsToClassicTab();

  return returnsToClassicTab()
    ? router.link('/v2/unit/{unitId}/{tab}', CLASSIC_TAB_PARAMS)
    : router.link('/');
}

/** Navigates to the same place as {@link useStreamsListLink}, e.g. after deleting the stream. */
export function useNavigateToStreamsList(): () => void {
  const router = useStreamsAppRouter();
  const returnsToClassicTab = useReturnsToClassicTab();
  const { rangeFrom, rangeTo } = useTimeRange();

  return useCallback(() => {
    const query = { rangeFrom, rangeTo };
    if (returnsToClassicTab()) {
      router.push('/v2/unit/{unitId}/{tab}', { ...CLASSIC_TAB_PARAMS, query });
    } else {
      router.push('/', { path: {}, query });
    }
  }, [router, returnsToClassicTab, rangeFrom, rangeTo]);
}
