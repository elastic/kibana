/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import type { ApplicationStart, Capabilities, CoreStart } from '@kbn/core/public';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import { i18n } from '@kbn/i18n';

import { SpacesMenu } from './components/spaces_menu';
import { useSpaces } from './hooks/use_spaces';
import { getProjectChromeDeploymentDisplayName } from './project_chrome_deployment_display_name';
import { ProjectChromeSwitcherRootMenu } from './project_chrome_switcher_root_menu';
import type { Space } from '../../common';
import type { EventTracker } from '../analytics';
import { getSpaceSolutionIconType } from '../space_solution_badge';
import type { SpacesManager } from '../spaces_manager';

/** Matches `data-test-subj` on the raw chrome breadcrumb (before `prepareBreadcrumbs`). */
export const SPACES_PROJECT_BREADCRUMB_TEST_SUBJ = 'spacesNavBreadcrumb';

const popoutContentId = 'headerSpacesMenuBreadcrumbContent';

export interface SpaceProjectBreadcrumbRegistrarProps {
  core: CoreStart;
  spacesManager: SpacesManager;
  serverBasePath: string;
  capabilities: Capabilities;
  navigateToApp: ApplicationStart['navigateToApp'];
  navigateToUrl: ApplicationStart['navigateToUrl'];
  allowSolutionVisibility: boolean;
  eventTracker: EventTracker;
}

export function SpaceProjectBreadcrumbRegistrar({
  core,
  spacesManager,
  serverBasePath,
  capabilities,
  navigateToApp,
  navigateToUrl,
  allowSolutionVisibility,
  eventTracker,
}: SpaceProjectBreadcrumbRegistrarProps) {
  const { euiTheme } = useEuiTheme();
  const spaceBreadcrumbLabelCss = useMemo(
    () => css`
      min-width: 0;
      color: ${euiTheme.colors.textParagraph};
      font-weight: ${euiTheme.font.weight.regular};

      .euiIcon {
        color: inherit;
      }
    `,
    [euiTheme.colors.textParagraph, euiTheme.font.weight.regular]
  );
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const { data, isLoading } = useSpaces(spacesManager);
  const chrome = core.chrome as InternalChromeStart;
  const kibanaName$ = useMemo(() => chrome.project.getKibanaName$(), [chrome.project]);
  const kibanaName = useObservable(kibanaName$, chrome.project.getKibanaName());
  const deploymentDisplayName = useMemo(
    () => getProjectChromeDeploymentDisplayName(kibanaName),
    [kibanaName]
  );

  useEffect(() => {
    const sub = spacesManager.onActiveSpaceChange$.subscribe(setActiveSpace);
    return () => sub.unsubscribe();
  }, [spacesManager]);

  const spaceSwitcherLabel = useMemo(() => {
    if (!activeSpace) {
      return '';
    }
    return `${deploymentDisplayName}: ${activeSpace.name}`;
  }, [activeSpace, deploymentDisplayName]);

  const breadcrumbText = useMemo(() => {
    if (!activeSpace) {
      return null;
    }
    if (!allowSolutionVisibility) {
      return spaceSwitcherLabel;
    }
    return (
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={spaceBreadcrumbLabelCss}
        title={spaceSwitcherLabel}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={getSpaceSolutionIconType(activeSpace.solution)}
            size="m"
            aria-hidden={true}
          />
        </EuiFlexItem>
        <EuiFlexItem css={spaceBreadcrumbLabelCss}>{spaceSwitcherLabel}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }, [activeSpace, allowSolutionVisibility, spaceBreadcrumbLabelCss, spaceSwitcherLabel]);

  useEffect(() => {
    if (!activeSpace || breadcrumbText == null) {
      chrome.project.setSpaceSwitcherBreadcrumb(undefined);
      return () => {
        chrome.project.setSpaceSwitcherBreadcrumb(undefined);
      };
    }

    chrome.project.setSpaceSwitcherBreadcrumb({
      text: breadcrumbText,
      'aria-label': i18n.translate(
        'xpack.spaces.navControl.projectBreadcrumb.spaceMenuButtonAriaLabel',
        {
          defaultMessage: 'Space menu, {deploymentAndSpace}',
          values: { deploymentAndSpace: spaceSwitcherLabel },
        }
      ),
      'data-test-subj': SPACES_PROJECT_BREADCRUMB_TEST_SUBJ,
      popoverContent: (closePopover) => (
        <ProjectChromeSwitcherRootMenu
          activeSpace={activeSpace}
          deploymentDisplayName={deploymentDisplayName}
          allowSolutionVisibility={allowSolutionVisibility}
          spacesMenu={({ navigateToPreviousContextPanel }) => (
            <SpacesMenu
              id={popoutContentId}
              spaces={data || []}
              serverBasePath={serverBasePath}
              toggleSpaceSelector={closePopover}
              capabilities={capabilities}
              navigateToApp={navigateToApp}
              navigateToUrl={navigateToUrl}
              activeSpace={activeSpace}
              allowSolutionVisibility={allowSolutionVisibility}
              eventTracker={eventTracker}
              onClickManageSpaceBtn={closePopover}
              isLoading={isLoading}
              onNavigateToPreviousContextPanel={navigateToPreviousContextPanel}
            />
          )}
        />
      ),
      popoverProps: {
        panelPaddingSize: 'none',
        zIndex: Number(euiTheme.levels.navigation) + 1,
        panelProps: {
          'data-test-subj': 'projectChromeSwitcherRootPanel',
        },
      },
    });

    return () => {
      chrome.project.setSpaceSwitcherBreadcrumb(undefined);
    };
  }, [
    activeSpace,
    allowSolutionVisibility,
    breadcrumbText,
    spaceSwitcherLabel,
    capabilities,
    chrome.project,
    data,
    eventTracker,
    isLoading,
    navigateToApp,
    navigateToUrl,
    serverBasePath,
    euiTheme.levels.navigation,
  ]);

  return null;
}
