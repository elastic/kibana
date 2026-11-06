/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { PLUGIN_ID } from '../common/constants';
import { SEARCH_BOOST_APP_TITLE } from './translations';
import type { SearchBoostSetupDependencies } from './types';

export class SearchBoostPlugin implements Plugin<void, void, SearchBoostSetupDependencies> {
  public setup(core: CoreSetup, { management }: SearchBoostSetupDependencies) {
    management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: SEARCH_BOOST_APP_TITLE,
      order: 1,
      keywords: ['boost', 'search power', 'search boost window', 'performance'],
      async mount(params: ManagementAppMountParams) {
        const [{ renderApp }, [coreStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        const { docTitle } = coreStart.chrome;
        docTitle.change(SEARCH_BOOST_APP_TITLE);
        params.setBreadcrumbs([{ text: SEARCH_BOOST_APP_TITLE }]);

        const unmountApp = renderApp(coreStart, params);
        return () => {
          docTitle.reset();
          unmountApp();
        };
      },
    });
  }

  public start() {}

  public stop() {}
}
