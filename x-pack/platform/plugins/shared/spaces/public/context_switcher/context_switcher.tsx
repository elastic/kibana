/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import { dynamic } from '@kbn/shared-ux-utility';

import type { SpacesManager } from '../spaces_manager';

const LazyContextSwitcherComponent = dynamic(() =>
  import('./context_switcher_component').then((m) => ({
    default: m.ContextSwitcherComponent,
  }))
);

export function initContextSwitcher(
  spacesManager: SpacesManager,
  core: CoreStart,
  allowSolutionVisibility: boolean,
  cloud?: CloudStart,
  isServerless?: boolean
) {
  if (!core.chrome.next.isEnabled) {
    return;
  }

  if (core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
    return;
  }

  core.chrome.next.contextSwitcher.set(
    <LazyContextSwitcherComponent
      spacesManager={spacesManager}
      core={core}
      cloud={cloud}
      isServerless={isServerless}
      allowSolutionVisibility={allowSolutionVisibility}
    />
  );
}
