/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EsqlViewsApp, type EsqlViewsAppProps } from './app';
import { EsqlViewsAppV2 } from './app_v2';
import { usePrototypeVersion } from './services/use_prototype_version';
import type { PrototypeVersion } from './services/prototype_version_store';

/**
 * Maps each prototype version to the App component (flyout included, since
 * `EsqlViewsApp` renders its own create/edit flyout) it should render.
 *
 * V3 doesn't have a distinct UX yet, so it falls back to the V1 implementation. Once
 * its design is ready, point this entry at a dedicated component -- the switcher and
 * its localStorage persistence already support all three slots.
 */
const VERSION_APPS: Record<PrototypeVersion, React.FunctionComponent<EsqlViewsAppProps>> = {
  v1: EsqlViewsApp,
  v2: EsqlViewsAppV2,
  v3: EsqlViewsApp,
};

export const VersionedEsqlViewsApp: React.FunctionComponent<EsqlViewsAppProps> = (props) => {
  const [version] = usePrototypeVersion();
  const VersionApp = VERSION_APPS[version];
  return <VersionApp {...props} />;
};
