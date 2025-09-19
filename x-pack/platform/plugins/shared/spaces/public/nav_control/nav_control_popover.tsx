/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PopoverAnchorPosition, WithEuiThemeProps } from '@elastic/eui';
import {
  EuiHeaderSectionItemButton,
  EuiPopover,
  EuiSkeletonRectangle,
  withEuiTheme,
} from '@elastic/eui';
import React, { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { Observable } from 'rxjs';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { SpacesMenu } from './components/spaces_menu';
import { useSpaces } from './hooks/use_spaces';
import { SolutionViewTour } from './solution_view_tour';
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
  theme: WithEuiThemeProps['theme'];
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
  showTour$: Observable<boolean>;
  onFinishTour: () => void;
}

const popoutContentId = 'headerSpacesMenuContent';

const NavControlPopoverUI: React.FC<Props> = ({
  spacesManager,
  anchorPosition,
  capabilities,
  navigateToApp,
  navigateToUrl,
  serverBasePath,
  theme,
  allowSolutionVisibility,
  eventTracker,
  showTour$,
  onFinishTour,
}) => {
  const [showSpaceSelector, setShowSpaceSelector] = useState(false);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [showTour, setShowTour] = useState(false);

  // Use React Query to fetch spaces, only when the popover is open
  const { data: spaces = [], isLoading } = useSpaces(spacesManager, showSpaceSelector);

  useEffect(() => {
    const activeSpace$ = spacesManager.onActiveSpaceChange$.subscribe({
      next: (space: Space) => {
        setActiveSpace(space);
      },
    });

    const showTour$Sub = showTour$.subscribe((shouldShowTour: boolean) => {
      setShowTour(shouldShowTour);
    });

    return () => {
      activeSpace$?.unsubscribe();
      showTour$Sub?.unsubscribe();
    };
  }, [spacesManager, showTour$]);

  const toggleSpaceSelector = useCallback(() => {
    setShowSpaceSelector((prev) => !prev);
  }, []);

  const closeSpaceSelector = useCallback(() => {
    setShowSpaceSelector(false);
  }, []);

  const getAlignedLoadingSpinner = () => {
    return (
      <EuiSkeletonRectangle
        borderRadius="m"
        contentAriaLabel={i18n.translate('xpack.spaces.navControl.popover.loadingSpacesLabel', {
          defaultMessage: 'Loading spaces navigation',
        })}
      />
    );
  };

  const getActiveSpaceButton = () => {
    if (!activeSpace) {
      return getButton(getAlignedLoadingSpinner(), 'loading spaces navigation');
    }

    return getButton(
      <Suspense fallback={getAlignedLoadingSpinner()}>
        <LazySpaceAvatar space={activeSpace} size={'s'} />
      </Suspense>,
      (activeSpace as Space).name
    );
  };

  const getButton = (linkIcon: JSX.Element, linkTitle: string) => {
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
  };

  const button = getActiveSpaceButton();
  const isTourOpen = Boolean(activeSpace) && showTour && !showSpaceSelector;

  return (
    <SolutionViewTour
      solution={activeSpace?.solution}
      isTourOpen={isTourOpen}
      onFinishTour={onFinishTour}
    >
      <EuiPopover
        id="spcMenuPopover"
        button={button}
        isOpen={showSpaceSelector}
        closePopover={closeSpaceSelector}
        anchorPosition={anchorPosition}
        panelPaddingSize="none"
        repositionOnScroll
        ownFocus
        zIndex={Number(theme.euiTheme.levels.navigation) + 1} // it needs to sit above the collapsible nav menu
        panelProps={{
          'data-test-subj': 'spaceMenuPopoverPanel',
        }}
      >
        <SpacesMenu
          id={popoutContentId}
          spaces={spaces}
          serverBasePath={serverBasePath}
          toggleSpaceSelector={toggleSpaceSelector}
          capabilities={capabilities}
          navigateToApp={navigateToApp}
          navigateToUrl={navigateToUrl}
          activeSpace={activeSpace}
          allowSolutionVisibility={allowSolutionVisibility}
          eventTracker={eventTracker}
          isLoading={isLoading}
          onClickManageSpaceBtn={() => {
            // No need to show the tour anymore, the user is taking action
            onFinishTour();
            toggleSpaceSelector();
          }}
        />
      </EuiPopover>
    </SolutionViewTour>
  );
};

export const NavControlPopover = withEuiTheme(NavControlPopoverUI);
