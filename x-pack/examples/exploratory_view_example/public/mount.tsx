/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { CoreSetup, AppMountParameters, APP_WRAPPER_CLASS } from '../../../../src/core/public';
import { StartDependencies } from './plugin';
import {
  KibanaContextProvider,
  RedirectAppLinks,
} from '../../../../src/plugins/kibana_react/public';
export const mount =
  (coreSetup: CoreSetup<StartDependencies>) =>
  async ({ element }: AppMountParameters) => {
    const [core, plugins] = await coreSetup.getStartServices();
    const { App } = await import('./app');

    const deps = {
      core,
      plugins,
    };

    const defaultIndexPattern = await plugins.data.indexPatterns.getDefault();

    const i18nCore = core.i18n;

    const reactElement = (
      <KibanaContextProvider services={{ ...coreSetup, ...core, ...plugins }}>
        <i18nCore.Context>
          <RedirectAppLinks application={core.application} className={APP_WRAPPER_CLASS}>
            <App {...deps} defaultIndexPattern={defaultIndexPattern} />
          </RedirectAppLinks>
        </i18nCore.Context>
      </KibanaContextProvider>
    );
    render(reactElement, element);
    return () => unmountComponentAtNode(element);
  };
