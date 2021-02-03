import {
  AppMountParameters,
  AppNavLinkStatus,
  CoreSetup,
  CoreStart,
  Plugin,
} from '../../../../src/core/public';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { SetupDeps, StartDeps } from './types';

export class ReportingExamplePlugin implements Plugin<void, void, {}, {}> {
  public setup(core: CoreSetup, { developerExamples, ...depsSetup }: SetupDeps): void {
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
        return renderApp(coreStart, { ...depsSetup, ...depsStart }, params);
      },
    });

    // Show the app in Developer Examples
    developerExamples.register({
      appId: 'reportingExample',
      title: 'Reporting integration',
      description: 'Demonstrate how to put an Export button on a page and generate reports.',
    });
  }

  public start() {}

  public stop() {}
}
