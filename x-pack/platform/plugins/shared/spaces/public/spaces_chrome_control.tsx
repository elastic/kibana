/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { useChromeStyle } from '@kbn/core-chrome-browser-hooks';

import type { EventTracker } from './analytics';
import type { ConfigType } from './config';
import { SpacesContextSwitcher } from './context_switcher';
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

  switch (chromeStyle) {
    case 'project':
      return (
        <SpacesContextSwitcher
          spacesManager={spacesManager}
          core={core}
          cloud={cloud}
          isServerless={isServerless}
          allowSolutionVisibility={config.allowSolutionVisibility}
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

  core.chrome.next.contextSwitcher.set(
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
