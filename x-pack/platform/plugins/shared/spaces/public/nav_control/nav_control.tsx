/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonCircle, EuiSkeletonRectangle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import type { CoreStart } from '@kbn/core/public';
import type { ChromeNextSpaceSelectorConfig } from '@kbn/core-chrome-browser';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { euiThemeVars } from '@kbn/ui-theme';

import { SpacesMenu } from './components/spaces_menu';
import { useSpaces } from './hooks/use_spaces';
import type { Space } from '../../common';
import type { EventTracker } from '../analytics';
import type { ConfigType } from '../config';
import { getSpaceAvatarComponent } from '../space_avatar';
import type { SpacesManager } from '../spaces_manager';

const LazyNavControlPopover = lazy(() =>
  import('./nav_control_popover').then(({ NavControlPopover }) => ({
    default: NavControlPopover,
  }))
);

const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
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

  registerHeaderSpacesControl(spacesManager, core, config, eventTracker, queryClient);
  registerSidenavSpacesControl(spacesManager, core, config, eventTracker, queryClient);
}

function registerHeaderSpacesControl(
  spacesManager: SpacesManager,
  core: CoreStart,
  config: ConfigType,
  eventTracker: EventTracker,
  queryClient: QueryClient
) {
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

function registerSidenavSpacesControl(
  spacesManager: SpacesManager,
  core: CoreStart,
  config: ConfigType,
  eventTracker: EventTracker,
  queryClient: QueryClient
) {
  if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
    return;
  }

  const SidenavSpacesPopoverContent = ({ closePopover }: { closePopover: () => void }) => {
    const [activeSpace, setActiveSpace] = useState<Space | null>(null);
    const { data, isLoading } = useSpaces(spacesManager);

    useEffect(() => {
      const sub = spacesManager.onActiveSpaceChange$.subscribe((space) => {
        setActiveSpace(space);
      });
      return () => sub.unsubscribe();
    }, []);

    const handleToggle = useCallback(() => {
      closePopover();
    }, [closePopover]);

    return (
      <SpacesMenu
        id="sidenavSpacesMenuContent"
        spaces={data || []}
        serverBasePath={core.http.basePath.serverBasePath}
        toggleSpaceSelector={handleToggle}
        capabilities={core.application.capabilities}
        navigateToApp={core.application.navigateToApp}
        navigateToUrl={core.application.navigateToUrl}
        activeSpace={activeSpace}
        allowSolutionVisibility={config.allowSolutionVisibility}
        eventTracker={eventTracker}
        onClickManageSpaceBtn={handleToggle}
        isLoading={isLoading}
        width="100%"
      />
    );
  };

  const setConfig = (space: Space | null) => {
    if (!space) {
      core.chrome.next.spaceSelector.set(undefined);
      return;
    }

    const selectorConfig: ChromeNextSpaceSelectorConfig = {
      label: space.name,
      renderAvatar: () => (
        <Suspense fallback={<EuiSkeletonCircle size="s" />}>
          <LazySpaceAvatar space={space} size="s" />
        </Suspense>
      ),
      renderPopover: (closePopover) => (
        <QueryClientProvider client={queryClient}>
          <SidenavSpacesPopoverContent closePopover={closePopover} />
        </QueryClientProvider>
      ),
    };

    core.chrome.next.spaceSelector.set(selectorConfig);
  };

  // Subscription intentionally lives for the page lifetime — no teardown needed.
  spacesManager.onActiveSpaceChange$.subscribe((space) => {
    setConfig(space);
  });
}
