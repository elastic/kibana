/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useLayoutEffect } from 'react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useChromeStyle } from '@kbn/core-chrome-browser-hooks';

import type { EventTracker } from './analytics';
import type { ConfigType } from './config';
import { SpacesContextSwitcher } from './context_switcher';
import { ProjectMenuComponent } from './context_switcher/context_switcher_component';
import { useContextSwitcherProposal } from './context_switcher/proposal';
import { ProposalSidebar } from './context_switcher/proposal_sidebar';
import { SpacesNavControl } from './nav_control';
import type { SpacesManager } from './spaces_manager';

interface SpacesChromeControlProps {
  spacesManager: SpacesManager;
  core: CoreStart;
  config: ConfigType;
  eventTracker: EventTracker;
  cloud?: CloudStart;
  isServerless?: boolean;
}

function SpacesChromeControl({
  spacesManager,
  core,
  config,
  eventTracker,
  cloud,
  isServerless,
}: SpacesChromeControlProps) {
  const chromeStyle = useChromeStyle();
  const proposal = useContextSwitcherProposal();
  const showProjectMenu =
    chromeStyle === 'project' &&
    proposal === 'proposal1' &&
    Boolean(isServerless || cloud?.isCloudEnabled);

  useLayoutEffect(() => {
    if (!showProjectMenu) {
      core.chrome.controls.headerLogo.set(undefined);
      return;
    }

    core.chrome.controls.headerLogo.set(
      <ProjectMenuComponent
        spacesManager={spacesManager}
        core={core}
        cloud={cloud}
        isServerless={isServerless}
        allowSolutionVisibility={config.allowSolutionVisibility}
      />
    );

    return () => {
      core.chrome.controls.headerLogo.set(undefined);
    };
  }, [cloud, config.allowSolutionVisibility, core, isServerless, showProjectMenu, spacesManager]);

  useLayoutEffect(() => {
    if (chromeStyle !== 'project') {
      core.chrome.controls.userMenuAction.set(undefined);
      return;
    }

    core.chrome.controls.userMenuAction.set(<ProposalSidebar />);

    return () => {
      core.chrome.controls.userMenuAction.set(undefined);
    };
  }, [chromeStyle, core]);

  switch (chromeStyle) {
    case 'project':
      return (
        <SpacesContextSwitcher
          spacesManager={spacesManager}
          core={core}
          cloud={cloud}
          isServerless={isServerless}
          allowSolutionVisibility={config.allowSolutionVisibility}
          variant={proposal}
        />
      );
    case 'classic':
      return (
        <SpacesNavControl
          spacesManager={spacesManager}
          core={core}
          config={config}
          eventTracker={eventTracker}
        />
      );
    default: {
      const exhaustive: never = chromeStyle;
      throw new Error(`Unknown chrome style: ${exhaustive}`);
    }
  }
}

export function initSpacesChromeControl(
  spacesManager: SpacesManager,
  core: CoreStart,
  config: ConfigType,
  eventTracker: EventTracker,
  cloud?: CloudStart,
  isServerless?: boolean
) {
  if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
    return;
  }

  core.chrome.controls.contextSwitcher.set(
    <SpacesChromeControl
      spacesManager={spacesManager}
      core={core}
      config={config}
      eventTracker={eventTracker}
      cloud={cloud}
      isServerless={isServerless}
    />
  );
}
