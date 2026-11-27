/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { SEARCH_BOOST_APP_ID } from '../common/constants';
import { SEARCH_BOOST_APP_TITLE } from './app_title';
import type { SearchBoostSetupDependencies, SearchBoostStartDependencies } from './types';

const INDEX_MANAGEMENT_APP_ID = 'index_management';

export class SearchBoostPlugin implements Plugin<
  void,
  void,
  SearchBoostSetupDependencies,
  SearchBoostStartDependencies
> {
  public setup(
    core: CoreSetup<SearchBoostStartDependencies>,
    { management }: SearchBoostSetupDependencies
  ) {
    management.sections.section.data.registerApp({
      id: SEARCH_BOOST_APP_ID,
      title: SEARCH_BOOST_APP_TITLE,
      order: 1,
      keywords: ['boost', 'search power', 'search boost window', 'performance'],
      async mount(params: ManagementAppMountParams) {
        const [{ renderApp }, [coreStart, startDependencies]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        const { docTitle } = coreStart.chrome;
        docTitle.change(SEARCH_BOOST_APP_TITLE);
        params.setBreadcrumbs([{ text: SEARCH_BOOST_APP_TITLE }]);

        const canOpenIndexManagement =
          management.sections.section.data.getApp(INDEX_MANAGEMENT_APP_ID)?.enabled === true;
        const unmountApp = renderApp(coreStart, startDependencies, params, canOpenIndexManagement);
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
