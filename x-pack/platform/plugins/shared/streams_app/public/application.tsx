/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { type AppMountParameters, type CoreStart } from '@kbn/core/public';
import React from 'react';
import { AppRoot } from './components/app_root';
import type { StreamsAppServices } from './services/types';
import type { StreamsAppStartDependencies } from './types';

export const StreamsApplication = ({
  coreStart,
  pluginsStart,
  services,
  appMountParameters,
  isServerless,
}: {
  coreStart: CoreStart;
  pluginsStart: StreamsAppStartDependencies;
  services: StreamsAppServices;
  isServerless: boolean;
} & { appMountParameters: AppMountParameters }) => {
  return coreStart.rendering.addContext(
    <AppRoot
      appMountParameters={appMountParameters}
      coreStart={coreStart}
      pluginsStart={pluginsStart}
      services={services}
      isServerless={isServerless}
    />
  );
};
