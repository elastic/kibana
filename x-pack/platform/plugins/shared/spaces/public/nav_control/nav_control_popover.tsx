/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PopoverAnchorPosition } from '@elastic/eui';
import { EuiButton, EuiPopover, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useEffect, useState } from 'react';
import type { Observable } from 'rxjs';

import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';

import { SpacesMenu } from './components/spaces_menu';
import { SPACES_QUERY_KEY, useSpaces } from './hooks/use_spaces';
import { SolutionViewTour } from './solution_view_tour';
import type { Space } from '../../common';
import type { SolutionView } from '../../common';
import type { EventTracker } from '../analytics';
import type { SpacesManager } from '../spaces_manager';

const SOLUTION_ICON_MAP: Record<NonNullable<SolutionView>, string> = {
  es: 'logoElasticsearch',
  oblt: 'logoObservability',
  security: 'logoSecurity',
  workplaceai: 'logoElasticsearch',
  classic: 'logoElasticStack',
};

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
  const queryClient = useQueryClient();
  const [showSpaceSelector, setShowSpaceSelector] = useState(false);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [showTour, setShowTour] = useState(false);
  const { data, isLoading } = useSpaces(spacesManager);

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

  const handleManageSpaceBtnClick = useCallback(() => {
    // No need to show the tour anymore, the user is taking action
    onFinishTour();
    toggleSpaceSelector();
  }, [onFinishTour, toggleSpaceSelector]);

  const solutionIconType =
    allowSolutionVisibility && activeSpace?.solution
      ? SOLUTION_ICON_MAP[activeSpace.solution]
      : SOLUTION_ICON_MAP.classic;

  const spaceButtonLabel = !activeSpace
    ? i18n.translate('xpack.spaces.navControl.popover.loadingSpacesLabel', {
        defaultMessage: 'Loading spaces navigation',
      })
    : (activeSpace as Space).name;

  const spaceButton = (
    <EuiButton
      aria-controls={popoutContentId}
      aria-expanded={showSpaceSelector}
      aria-haspopup="true"
      aria-label={i18n.translate('xpack.spaces.navControl.popover.spacesNavigationLabel', {
        defaultMessage: 'Spaces navigation',
      })}
      data-test-subj="spacesNavSelector"
      iconType={solutionIconType}
      onClick={toggleSpaceSelector}
      color="text"
      size="s"
      css={css`
        background-color: transparent !important;
        block-size: 28px;
        margin-left: 4px;
      `}
    >
      {spaceButtonLabel}
    </EuiButton>
  );

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
        button={spaceButton}
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
          spaces={data || []}
          serverBasePath={serverBasePath}
          toggleSpaceSelector={toggleSpaceSelector}
          capabilities={capabilities}
          navigateToApp={navigateToApp}
          navigateToUrl={navigateToUrl}
          activeSpace={activeSpace}
          allowSolutionVisibility={allowSolutionVisibility}
          eventTracker={eventTracker}
          onClickManageSpaceBtn={handleManageSpaceBtnClick}
          isLoading={isLoading}
        />
      </EuiPopover>
    </SolutionViewTour>
  );
};

export const NavControlPopover = NavControlPopoverUI;
