/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { STREAMS_DEFAULT_UNIT_ID } from '@kbn/streams-plugin/common';
import { useStreamsAppRouter } from '../../hooks/use_streams_app_router';
import { useStreamsPrivileges } from '../../hooks/use_streams_privileges';

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

/** Link back to the streams list: the Classic tab when the stream was opened from it, `/` otherwise. */
export function useStreamsListLink(): string {
  const router = useStreamsAppRouter();
  const {
    access: { legacy, v2 },
  } = useStreamsPrivileges();

  if (legacy && v2 && isClassicTabOrigin()) {
    return router.link('/v2/unit/{unitId}/{tab}', {
      path: { unitId: STREAMS_DEFAULT_UNIT_ID, tab: 'classic' },
    });
  }

  return router.link('/');
}
