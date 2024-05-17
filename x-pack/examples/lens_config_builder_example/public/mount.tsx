/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';

import type { CoreSetup, AppMountParameters } from '@kbn/core/public';
import type { StartDependencies } from './plugin';

export const mount =
  (coreSetup: CoreSetup<StartDependencies>) =>
  async ({ element }: AppMountParameters) => {
    const root = createRoot(element);
    const [core, plugins] = await coreSetup.getStartServices();
    const { App } = await import('./app');

    const dataViews = plugins.data.indexPatterns;
    const { formula } = await plugins.lens.stateHelperApi();

    const i18nCore = core.i18n;

    const reactElement = (
      <i18nCore.Context>
        <App core={core} plugins={plugins} dataViews={dataViews} formula={formula} />~
      </i18nCore.Context>
    );

    root.render(reactElement);
    return () => {
      root.unmount();
      plugins.data.search.session.clear();
    };
  };
