/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { EuiCallOut } from '@elastic/eui';

import type { CoreSetup, AppMountParameters } from '@kbn/core/public';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { StartDependencies } from './plugin';

export const mount =
  (coreSetup: CoreSetup<StartDependencies>) =>
  async ({ element }: AppMountParameters) => {
    const [core, plugins] = await coreSetup.getStartServices();
    const { App } = await import('./app');

    const defaultDataView = await plugins.data.indexPatterns.getDefault();
    const { formula } = await plugins.lens.stateHelperApi();

    const { analytics, i18n, theme } = core;
    const startServices = { analytics, i18n, theme };

    const reactElement = (
      <KibanaRenderContextProvider {...startServices}>
        {defaultDataView && defaultDataView.isTimeBased() ? (
          <App core={core} plugins={plugins} defaultDataView={defaultDataView} formula={formula} />
        ) : (
          <EuiCallOut
            title="Please define a default index pattern to use this demo"
            color="danger"
            iconType="warning"
          >
            <p>This demo only works if your default index pattern is set and time based</p>
          </EuiCallOut>
        )}
      </KibanaRenderContextProvider>
    );

    render(reactElement, element);
    return () => {
      unmountComponentAtNode(element);
      plugins.data.search.session.clear();
    };
  };
