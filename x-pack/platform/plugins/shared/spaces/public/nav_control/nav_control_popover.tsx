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
import type { Observable } from 'rxjs';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import { SpacesMenu } from './components/spaces_menu';
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
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
  showTour$: Observable<boolean>;
  onFinishTour: () => void;
  manageSpacesDocsLink: string;
  manageSpacesLink: string;
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
  showTour$,
  onFinishTour,
  manageSpacesDocsLink,
  manageSpacesLink,
}: Props) => {
  const { euiTheme } = useEuiTheme();
  const [showSpaceSelector, setShowSpaceSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const activeSpace$ = spacesManager.onActiveSpaceChange$.subscribe({
      next: (space: Space) => {
        setActiveSpace(space);
      },
    });

    const showTour$Sub = showTour$.subscribe((tour: boolean) => {
      setShowTour(tour);
    });

    return () => {
      activeSpace$.unsubscribe();
      showTour$Sub.unsubscribe();
    };
  }, [spacesManager, showTour$]);

  const loadSpaces = useCallback(async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    const spacesList = await spacesManager.getSpaces();
    setSpaces(spacesList);
    setLoading(false);
  }, [spacesManager, loading]);

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

  const toggleSpaceSelector = useCallback(() => {
    const isOpening = !showSpaceSelector;

    if (isOpening) {
      loadSpaces();
    }

    setShowSpaceSelector(!showSpaceSelector);
  }, [showSpaceSelector, loadSpaces]);

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
      </Suspense>,
      (activeSpace as Space).name
    );
  }, [activeSpace, getButton, getAlignedLoadingSpinner]);

  const closeSpaceSelector = useCallback(() => {
    setShowSpaceSelector(false);
  }, []);

  const handleManageSpaceBtnClick = useCallback(() => {
    // No need to show the tour anymore, the user is taking action
    onFinishTour();
    toggleSpaceSelector();
  }, [onFinishTour, toggleSpaceSelector]);

  const button = getActiveSpaceButton();
  const isTourOpen = Boolean(activeSpace) && showTour && !showSpaceSelector;

  return (
    <SolutionViewTour
      solution={activeSpace?.solution}
      isTourOpen={isTourOpen}
      onFinishTour={onFinishTour}
      manageSpacesLink={manageSpacesLink}
      manageSpacesDocsLink={manageSpacesDocsLink}
      navigateToUrl={navigateToUrl}
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
        zIndex={Number(euiTheme.levels.navigation) + 1} // it needs to sit above the collapsible nav menu
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
          onClickManageSpaceBtn={handleManageSpaceBtnClick}
          isLoading={loading}
        />
      </EuiPopover>
    </SolutionViewTour>
  );
};

export const NavControlPopover = NavControlPopoverUI;
