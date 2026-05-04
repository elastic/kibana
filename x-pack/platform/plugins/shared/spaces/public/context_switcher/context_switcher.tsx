/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { ContextSwitcherComponent } from './context_switcher_component';
import type { SpacesManager } from '../spaces_manager';

export function initContextSwitcher(
  spacesManager: SpacesManager,
  core: CoreStart,
  allowSolutionVisibility: boolean,
  cloud?: CloudStart,
  isServerless?: boolean
) {
  if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
    return;
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 0, networkMode: 'always' },
    },
  });

  core.chrome.next.contextSwitcher.set(
    <QueryClientProvider client={queryClient}>
      <ContextSwitcherComponent
        spacesManager={spacesManager}
        core={core}
        cloud={cloud}
        isServerless={isServerless}
        allowSolutionVisibility={allowSolutionVisibility}
      />
    </QueryClientProvider>
  );
}
