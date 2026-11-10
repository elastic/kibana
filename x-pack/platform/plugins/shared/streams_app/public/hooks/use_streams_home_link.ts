/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { useStreamsAppParams } from './use_streams_app_params';
import { useStreamsAppRouter } from './use_streams_app_router';
import { useStreamsPrivileges } from './use_streams_privileges';
import { useTimeRange } from './use_time_range';

/** `v2` marks a stream page opened from the Classic tab of the V2 layout. */
export type StreamOrigin = 'v2';

const CLASSIC_TAB_PATH = { unitId: STREAMS_DEFAULT_UNIT_ID, tab: 'classic' };

/** The `origin` of the open stream page, for links that stay on stream pages to copy. */
export function useStreamOrigin(): StreamOrigin | undefined {
  return useStreamsAppParams('/{key}', true)?.query.origin;
}

function useReturnsToClassicTab(): boolean {
  const origin = useStreamOrigin();
  const {
    access: { legacy, v2 },
  } = useStreamsPrivileges();
  return origin === 'v2' && legacy && v2;
}

/** Link back to the streams list: the Classic tab when the stream was opened from it, `/` otherwise. */
export function useStreamsHomeLink(): string {
  const router = useStreamsAppRouter();
  const returnsToClassicTab = useReturnsToClassicTab();
  const { rangeFrom, rangeTo } = useTimeRange();

  // `/` takes no params here, DateRangeRedirect adds the range.
  return returnsToClassicTab
    ? router.link('/v2/unit/{unitId}/{tab}', {
        path: CLASSIC_TAB_PATH,
        query: { rangeFrom, rangeTo },
      })
    : router.link('/');
}

/** Navigates to the same place as {@link useStreamsHomeLink}, e.g. after deleting the stream. */
export function useNavigateToStreamsHome(): () => void {
  const router = useStreamsAppRouter();
  const returnsToClassicTab = useReturnsToClassicTab();
  const { rangeFrom, rangeTo } = useTimeRange();

  return useCallback(() => {
    const query = { rangeFrom, rangeTo };
    if (returnsToClassicTab) {
      router.push('/v2/unit/{unitId}/{tab}', { path: CLASSIC_TAB_PATH, query });
    } else {
      router.push('/', { path: {}, query });
    }
  }, [router, returnsToClassicTab, rangeFrom, rangeTo]);
}
