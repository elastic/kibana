/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import type { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';

import { App, AppContext } from './app';

interface SetupDeps {
  developerExamples: DeveloperExamplesSetup;
}

const APPLICATION_ID = 'screenshottingExample';
const APPLICATION_NAME = 'Screenshotting Example';

export class ScreenshottingExamplePlugin implements Plugin<void, void> {
  setup({ application, getStartServices }: CoreSetup, { developerExamples }: SetupDeps): void {
    application.register({
      id: APPLICATION_ID,
      title: APPLICATION_NAME,
      visibleIn: [],
      mount: async ({ element }: AppMountParameters) => {
        const [{ http, analytics, i18n, theme, userProfile }] = await getStartServices();
        const startServices = { analytics, http, i18n, theme, userProfile };

        ReactDOM.render(
          <AppContext.Provider value={startServices}>
            <App />
          </AppContext.Provider>,
          element
        );
        return () => ReactDOM.unmountComponentAtNode(element);
      },
    });

    developerExamples.register({
      appId: APPLICATION_ID,
      title: APPLICATION_NAME,
      description: 'An example integration with the screenshotting plugin.',
    });
  }

  start() {}
}
