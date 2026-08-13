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
  KnowledgeIndicatorsPanelComponent,
  SignificantEventsAppStartDependencies,
} from '../../types';
import type { SignificantEventsAppServices } from '../../services/types';

export type { KnowledgeIndicatorsPanelComponent };

const KnowledgeIndicatorsPanelLazy = dynamic(() =>
  import('./knowledge_indicators_panel').then((mod) => ({
    default: mod.KnowledgeIndicatorsPanel,
  }))
);

/**
 * Factory used by `getKnowledgeIndicatorsPanel()`. Returns a React component that
 * embeds KnowledgeIndicatorsPanel with its own context — safe to render anywhere
 * in the Kibana shell, including inside streams_app pages.
 *
 * The plugin loads this module via `dynamic()` so QueryClient / MemoryRouter stay
 * off SEA page-load until a consumer renders the panel.
 */
export function createKnowledgeIndicatorsPanel({
  coreStart,
  pluginsStart,
  services,
}: {
  coreStart: CoreStart;
  pluginsStart: SignificantEventsAppStartDependencies;
  services: SignificantEventsAppServices;
}): KnowledgeIndicatorsPanelComponent {
  const context = {
    core: coreStart,
    dependencies: { start: pluginsStart },
    services,
  };

  return function KnowledgeIndicatorsPanelEmbedded({ streamName }: { streamName: string }) {
    return (
      <SignificantEventsAppContextProvider context={context}>
        <QueryClientProvider client={significantEventsQueryClient}>
          {/* MemoryRouter satisfies useHistory() inside the panel; navigation uses
              application.getUrlForApp() so the in-memory history is never touched. */}
          <MemoryRouter>
            <KnowledgeIndicatorsPanelLazy streamName={streamName} />
          </MemoryRouter>
        </QueryClientProvider>
      </SignificantEventsAppContextProvider>
    );
  };
}
