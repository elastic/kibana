/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import type { CoreStart } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';

const STREAMS_APP_ID = 'streams';

/**
 * True when the user is in an Observability- or Security-oriented navigation context:
 * - Project / serverless: active chrome solution is `oblt` or `security`
 * - Classic: current app category is observability or security, or the Streams app (management category)
 */
export function useAgentBuilderAnnouncementChromeScope(core: CoreStart): boolean {
  const solutionNavId = useObservable(
    core.chrome.getActiveSolutionNavId$(),
    core.chrome.getActiveSolutionNavId()
  );
  const currentAppId = useObservable(core.application.currentAppId$);
  const applications = useObservable(core.application.applications$, new Map());

  return useMemo(() => {
    if (solutionNavId === 'oblt' || solutionNavId === 'security') {
      return true;
    }
    if (solutionNavId != null) {
      return false;
    }
    if (!currentAppId) {
      return false;
    }
    if (currentAppId === STREAMS_APP_ID) {
      return true;
    }
    const app = applications.get(currentAppId);
    const categoryId = app?.category?.id;
    return (
      categoryId === DEFAULT_APP_CATEGORIES.observability.id ||
      categoryId === DEFAULT_APP_CATEGORIES.security.id
    );
  }, [solutionNavId, currentAppId, applications]);
}
