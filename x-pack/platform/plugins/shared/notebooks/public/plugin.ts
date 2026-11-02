/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { APP_ID, APP_ROUTE, PLUGIN_NAME } from '../common/constants';

export interface NotebookStartDependencies {
  data: DataPublicPluginStart;
  lens: LensPublicStart;
}

export class NotebookPlugin implements Plugin<void, void, {}, NotebookStartDependencies> {
  public setup(core: CoreSetup<NotebookStartDependencies>): void {
    core.application.register({
      id: APP_ID,
      title: PLUGIN_NAME,
      appRoute: APP_ROUTE,
      euiIconType: 'logoKibana',
      category: DEFAULT_APP_CATEGORIES.kibana,
      order: 8500,
      mount: async (params: AppMountParameters) => {
        const [[coreStart, plugins], { renderApp }] = await Promise.all([
          core.getStartServices(),
          import('./application'),
        ]);
        return renderApp({ coreStart, plugins, params });
      },
    });
  }

  public start(): void {}

  public stop(): void {}
}
