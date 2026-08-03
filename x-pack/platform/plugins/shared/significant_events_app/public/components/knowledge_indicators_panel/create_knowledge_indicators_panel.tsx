/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import type { Streams } from '@kbn/streams-schema';
import { dynamic } from '@kbn/shared-ux-utility';
import { SignificantEventsAppContextProvider } from '../../app_root/app_context_provider';
import type { SignificantEventsAppStartDependencies } from '../../types';
import type { SignificantEventsAppServices } from '../../services/types';

const KnowledgeIndicatorsPanelLazy = dynamic(() =>
  import('./knowledge_indicators_panel').then((mod) => ({
    default: mod.KnowledgeIndicatorsPanel,
  }))
);

// Module-level QueryClient so all embedded panel instances share a single cache.
const embeddedQueryClient = new QueryClient();

/**
 * Factory called once in plugin start(). Returns a React component that embeds
 * KnowledgeIndicatorsPanel with its own context — safe to render anywhere in the
 * Kibana shell, including inside streams_app pages.
 */
export function createKnowledgeIndicatorsPanel({
  coreStart,
  pluginsStart,
  services,
  isServerless,
}: {
  coreStart: CoreStart;
  pluginsStart: SignificantEventsAppStartDependencies;
  services: SignificantEventsAppServices;
  isServerless: boolean;
}): React.ComponentType<{ definition: Streams.all.GetResponse }> {
  const context = {
    core: coreStart,
    dependencies: { start: pluginsStart },
    services,
    isServerless,
  };

  return function KnowledgeIndicatorsPanelEmbedded({
    definition,
  }: {
    definition: Streams.all.GetResponse;
  }) {
    return (
      <SignificantEventsAppContextProvider context={context}>
        <QueryClientProvider client={embeddedQueryClient}>
          {/* MemoryRouter satisfies useHistory() inside the panel; navigation uses
              application.getUrlForApp() so the in-memory history is never touched. */}
          <MemoryRouter>
            <KnowledgeIndicatorsPanelLazy definition={definition} />
          </MemoryRouter>
        </QueryClientProvider>
      </SignificantEventsAppContextProvider>
    );
  };
}
