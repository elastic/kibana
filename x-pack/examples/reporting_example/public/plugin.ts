/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AppMountParameters,
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  Plugin,
} from '@kbn/core/public';
import { PLUGIN_ID, PLUGIN_NAME, ReportingExampleLocatorDefinition } from '../common';
import { SetupDeps, StartDeps, MyForwardableState } from './types';

export class ReportingExamplePlugin implements Plugin<void, void, {}, {}> {
  public setup(core: CoreSetup, { developerExamples, screenshotMode, share }: SetupDeps): void {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      navLinkStatus: AppNavLinkStatus.hidden,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = (await core.getStartServices()) as [
          CoreStart,
          StartDeps,
          unknown
        ];
        // Render the application
        return renderApp(
          coreStart,
          { ...depsStart, screenshotMode, share },
          params,
          params.history.location.state as MyForwardableState
        );
      },
    });

    // Show the app in Developer Examples
    developerExamples.register({
      appId: 'reportingExample',
      title: 'Reporting integration',
      description: 'Demonstrate how to put an Export button on a page and generate reports.',
    });

    share.url.locators.create(new ReportingExampleLocatorDefinition());
  }

  public start() {}

  public stop() {}
}
