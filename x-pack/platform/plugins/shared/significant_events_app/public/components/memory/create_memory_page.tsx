/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { dynamic } from '@kbn/shared-ux-utility';
import { SignificantEventsAppContextProvider } from '../../app_root/app_context_provider';
import { significantEventsQueryClient } from '../../query_client';
import type {
  MemoryPageComponent,
  SignificantEventsAppStartDependencies,
} from '../../types';
import type { SignificantEventsAppServices } from '../../services/types';

export type { MemoryPageComponent };

const MemoryTabLazy = dynamic(() =>
  import('../../pages/significant_events/components/memory/tab').then((mod) => ({
    default: mod.MemoryTab,
  }))
);

/**
 * Factory used by `getMemoryPage()`. Returns a React component that embeds the
 * Memory tab with its own Significant Events context — safe to render from Nightshift.
 */
export function createMemoryPage({
  coreStart,
  pluginsStart,
  services,
}: {
  coreStart: CoreStart;
  pluginsStart: SignificantEventsAppStartDependencies;
  services: SignificantEventsAppServices;
}): MemoryPageComponent {
  const context = {
    core: coreStart,
    dependencies: { start: pluginsStart },
    services,
  };

  return function MemoryPageEmbedded() {
    return (
      <SignificantEventsAppContextProvider context={context}>
        <QueryClientProvider client={significantEventsQueryClient}>
          {/* MemoryRouter satisfies hooks that expect a router; MemoryTab navigates via
              application APIs / local state, so the in-memory history is unused. */}
          <MemoryRouter>
            <MemoryTabLazy />
          </MemoryRouter>
        </QueryClientProvider>
      </SignificantEventsAppContextProvider>
    );
  };
}
