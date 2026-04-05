/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PopoverAnchorPosition } from '@elastic/eui';
import {
  EuiHeaderSectionItemButton,
  EuiPopover,
  EuiSkeletonRectangle,
  useEuiTheme,
} from '@elastic/eui';
import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';

import { SpacesMenu } from './components/spaces_menu';
import { useSolutionViewSwitchAnnouncements } from './hooks/use_solution_view_switch_announcements';
import { SPACES_QUERY_KEY, useSpaces } from './hooks/use_spaces';
import { NavControlPopoverNotification } from './nav_control_popover_notification';
import { SolutionViewSwitchTour } from './solution_view_switch_tour';
import type { Space } from '../../common';
import type { EventTracker } from '../analytics';
import { getSpaceAvatarComponent } from '../space_avatar';
import type { SpacesManager } from '../spaces_manager';

// No need to wrap LazySpaceAvatar in an error boundary, because it is one of the first chunks loaded when opening Kibana.
const LazySpaceAvatar = lazy(() =>
  getSpaceAvatarComponent().then((component) => ({ default: component }))
);

export interface Props {
  spacesManager: SpacesManager;
  anchorPosition: PopoverAnchorPosition;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  serverBasePath: string;
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
  areAnnouncementsEnabled: boolean;
}

const popoutContentId = 'headerSpacesMenuContent';

const NavControlPopoverUI = ({
  spacesManager,
  anchorPosition,
  capabilities,
  navigateToApp,
  navigateToUrl,
  serverBasePath,
  allowSolutionVisibility,
  eventTracker,
  areAnnouncementsEnabled,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const queryClient = useQueryClient();
  const [showSpaceSelector, setShowSpaceSelector] = useState(false);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const { data, isLoading } = useSpaces(spacesManager);

  useEffect(() => {
    const activeSpace$ = spacesManager.onActiveSpaceChange$.subscribe({
      next: (space: Space) => {
        setActiveSpace(space);
      },
    });

    return () => {
      activeSpace$.unsubscribe();
    };
  }, [spacesManager]);

  const toggleSpaceSelector = useCallback(() => {
    setShowSpaceSelector(!showSpaceSelector);
    // Invalidate spaces cache when opening the popover to ensure fresh data
    if (!showSpaceSelector) {
      queryClient.invalidateQueries({ queryKey: SPACES_QUERY_KEY });
    }
  }, [showSpaceSelector, queryClient]);

  const closeSpaceSelector = useCallback(() => {
    setShowSpaceSelector(false);
  }, []);

  const { showNotification, tourProps } = useSolutionViewSwitchAnnouncements({
    activeSpace,
    capabilities,
    areAnnouncementsEnabled,
    closeSpaceSelector,
    navigateToApp,
  });

  const getAlignedLoadingSpinner = useCallback(() => {
    return (
      <EuiSkeletonRectangle
        borderRadius="m"
        contentAriaLabel={i18n.translate('xpack.spaces.navControl.popover.loadingSpacesLabel', {
          defaultMessage: 'Loading spaces navigation',
        })}
      />
    );
  }, []);

  const getButton = useCallback(
    (linkIcon: JSX.Element, linkTitle: string) => {
      return (
        <EuiHeaderSectionItemButton
          aria-controls={popoutContentId}
          aria-expanded={showSpaceSelector}
          aria-haspopup="true"
          aria-label={i18n.translate('xpack.spaces.navControl.popover.spacesNavigationLabel', {
            defaultMessage: 'Spaces navigation',
          })}
          aria-describedby="spacesNavDetails"
          data-test-subj="spacesNavSelector"
          title={linkTitle}
          onClick={toggleSpaceSelector}
        >
          {linkIcon}
          <p id="spacesNavDetails" hidden>
            {i18n.translate('xpack.spaces.navControl.popover.spaceNavigationDetails', {
              defaultMessage:
                '{space} is the currently selected space. Click this button to open a popover that allows you to select the active space.',
              values: {
                space: linkTitle,
              },
            })}
          </p>
        </EuiHeaderSectionItemButton>
      );
    },
    [showSpaceSelector, toggleSpaceSelector]
  );

  const getActiveSpaceButton = useCallback(() => {
    if (!activeSpace) {
      return getButton(getAlignedLoadingSpinner(), 'loading spaces navigation');
    }

    return getButton(
      <Suspense fallback={getAlignedLoadingSpinner()}>
        <LazySpaceAvatar space={activeSpace} size={'s'} />
        {showNotification && <NavControlPopoverNotification />}
      </Suspense>,
      (activeSpace as Space).name
    );
  }, [activeSpace, getButton, getAlignedLoadingSpinner, showNotification]);

  const button = getActiveSpaceButton();

  const shouldRenderTour = Boolean(showSpaceSelector && !isLoading);

  return (
    <EuiPopover
      id="spcMenuPopover"
      button={button}
      isOpen={showSpaceSelector}
      closePopover={closeSpaceSelector}
      anchorPosition={anchorPosition}
      panelPaddingSize="none"
      repositionOnScroll
      ownFocus
      zIndex={Number(euiTheme.levels.navigation) + 1} // it needs to sit above the collapsible nav menu
      panelProps={{
        'data-test-subj': 'spaceMenuPopoverPanel',
      }}
    >
      {shouldRenderTour && tourProps && <SolutionViewSwitchTour {...tourProps} />}
      <SpacesMenu
        id={popoutContentId}
        spaces={data || []}
        serverBasePath={serverBasePath}
        toggleSpaceSelector={toggleSpaceSelector}
        capabilities={capabilities}
        navigateToApp={navigateToApp}
        navigateToUrl={navigateToUrl}
        activeSpace={activeSpace}
        allowSolutionVisibility={allowSolutionVisibility}
        eventTracker={eventTracker}
        onClickManageSpaceBtn={toggleSpaceSelector}
        isLoading={isLoading}
      />
    </EuiPopover>
  );
};

export const NavControlPopover = NavControlPopoverUI;
