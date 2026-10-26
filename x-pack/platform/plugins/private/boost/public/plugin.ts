/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { BOOST_SAMPLE_DATA_API_PATH, PLUGIN_ID } from '../common/constants';
import { registerIndexManagementExtensions } from './index_management_extensions';
import { BOOST_APP_TITLE } from './translations';
import type { BoostSetupDependencies, BoostStartDependencies } from './types';

export class BoostPlugin
  implements Plugin<void, void, BoostSetupDependencies, BoostStartDependencies>
{
  private unregisterPrototypeMenu?: () => void;

  public setup(core: CoreSetup<BoostStartDependencies>, { management }: BoostSetupDependencies) {
    management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: BOOST_APP_TITLE,
      order: 2,
      keywords: ['boost', 'search power', 'search boost window', 'performance'],
      async mount(params: ManagementAppMountParams) {
        const [{ renderApp }, [coreStart, depsStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        return renderApp(coreStart, depsStart, params);
      },
    });
  }

  public start(core: CoreStart, deps: BoostStartDependencies) {
    const capabilities = core.application.capabilities[PLUGIN_ID];
    const { indexManagement } = deps;
    if (indexManagement && capabilities?.show === true) {
      registerIndexManagementExtensions(core, { ...deps, indexManagement });
    }
    if (capabilities?.save !== true) {
      return;
    }

    // Seeds the prototype's sample indices and data streams the first time anyone who can manage
    // boost loads Kibana; later loads are no-ops. Best effort: failures leave the project unseeded,
    // and "Restore prototype defaults" reports errors if a user retries.
    core.http.post(BOOST_SAMPLE_DATA_API_PATH).catch(() => {});

    // Core has no general header-button API for plugins, so the prototype menu borrows the AI button
    // slot. Registering synchronously here places it between the help menu and the AI agent button.
    this.unregisterPrototypeMenu = core.chrome.controls.aiButton.register({
      content: (element: HTMLElement) => {
        let unmount: (() => void) | undefined;
        let isUnmounted = false;

        void import('./prototype/mount_prototype_menu').then(({ mountPrototypeMenu }) => {
          if (!isUnmounted) {
            unmount = mountPrototypeMenu(element, core);
          }
        });

        return () => {
          isUnmounted = true;
          unmount?.();
        };
      },
    });
  }

  public stop() {
    this.unregisterPrototypeMenu?.();
  }
}
