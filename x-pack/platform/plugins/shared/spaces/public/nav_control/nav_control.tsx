/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonRectangle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { lazy, Suspense } from 'react';

import type { CoreStart } from '@kbn/core/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { euiThemeVars } from '@kbn/ui-theme';

import type { EventTracker } from '../analytics';
import type { ConfigType } from '../config';
import type { SpacesManager } from '../spaces_manager';

const LazyNavControlPopover = lazy(() =>
  import('./nav_control_popover').then(({ NavControlPopover }) => ({
    default: NavControlPopover,
  }))
);

export function initSpacesNavControl(
  spacesManager: SpacesManager,
  core: CoreStart,
  config: ConfigType,
  eventTracker: EventTracker
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        networkMode: 'always',
      },
    },
  });

  const SpacesNavControl = () => {
    if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
      return null;
    }

    return (
      <QueryClientProvider client={queryClient}>
        <Suspense
          fallback={
            <EuiSkeletonRectangle
              css={css`
                margin-inline: ${euiThemeVars.euiSizeS};
              `}
              borderRadius="m"
              contentAriaLabel="Loading navigation"
            />
          }
        >
          <LazyNavControlPopover
            spacesManager={spacesManager}
            serverBasePath={core.http.basePath.serverBasePath}
            anchorPosition="downLeft"
            capabilities={core.application.capabilities}
            navigateToApp={core.application.navigateToApp}
            navigateToUrl={core.application.navigateToUrl}
            allowSolutionVisibility={config.allowSolutionVisibility}
            eventTracker={eventTracker}
            areAnnouncementsEnabled={core.notifications.tours.isEnabled()}
          />
        </Suspense>
      </QueryClientProvider>
    );
  };

  core.chrome.navControls.registerLeft({
    order: 1000,
    content: <SpacesNavControl />,
  });
}
