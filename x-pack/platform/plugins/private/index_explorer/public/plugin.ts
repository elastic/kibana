/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMountParameters, CoreSetup, Plugin } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import { PLUGIN_ID } from '../common/constants';

export interface IndexExplorerStartDependencies {
  readonly dataViews: DataViewsPublicPluginStart;
  readonly lens: LensPublicStart;
}

export class IndexExplorerPlugin implements Plugin<void, void, {}, IndexExplorerStartDependencies> {
  public setup(core: CoreSetup<IndexExplorerStartDependencies>): void {
    core.application.register({
      id: PLUGIN_ID,
      title: i18n.translate('xpack.indexExplorer.navTitle', { defaultMessage: 'Index Explorer' }),
      euiIconType: 'visTable',
      category: DEFAULT_APP_CATEGORIES.kibana,
      order: 8100,
      async mount(params: AppMountParameters) {
        const [coreStart, plugins] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({ coreStart, plugins, params });
      },
    });
  }

  public start(): void {}

  public stop(): void {}
}
