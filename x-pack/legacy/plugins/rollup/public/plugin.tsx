/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, unmountComponentAtNode } from 'react-dom';
import { HashRouter as Router } from 'react-router-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import {
  EditorConfigProviderRegistry,
  AggTypeFilters,
  AggTypeFieldFilters,
} from './legacy_imports';
import { SearchStrategyProvider } from '../../../../../src/plugins/data/public';
import { ManagementSetup } from '../../../../../src/legacy/core_plugins/management/public/np_ready';
import { rollupBadgeExtension, rollupToggleExtension } from './extend_index_management';
// @ts-ignore
import { RollupIndexPatternCreationConfig } from './index_pattern_creation/rollup_index_pattern_creation_config';
// @ts-ignore
import { RollupIndexPatternListConfig } from './index_pattern_list/rollup_index_pattern_list_config';
import { getRollupSearchStrategy } from './search/rollup_search_strategy';
// @ts-ignore
import { initAggTypeFilter } from './visualize/agg_type_filter';
// @ts-ignore
import { initAggTypeFieldFilter } from './visualize/agg_type_field_filter';
// @ts-ignore
import { initEditorConfig } from './visualize/editor_config';
import { CONFIG_ROLLUPS } from '../common';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../src/plugins/home/public';
// @ts-ignore
import { CRUD_APP_BASE_PATH } from './crud_app/constants';
// @ts-ignore
import { App } from './crud_app/app';
import { ManagementStart } from '../../../../../src/plugins/management/public';
// @ts-ignore
import { rollupJobsStore } from './crud_app/store';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
// @ts-ignore
import { setEsBaseAndXPackBase, setHttp } from './crud_app/services';
import { setNotifications, setFatalErrors } from './kibana_services';

export interface RollupPluginSetupDependencies {
  __LEGACY: {
    aggTypeFilters: AggTypeFilters;
    aggTypeFieldFilters: AggTypeFieldFilters;
    editorConfigProviders: EditorConfigProviderRegistry;
    addSearchStrategy: (searchStrategy: SearchStrategyProvider) => void;
    management: ManagementSetup;
    addBadgeExtension: (badgeExtension: any) => void;
    addToggleExtension: (toggleExtension: any) => void;
  };
  home?: HomePublicPluginSetup;
}

export interface RollupPluginStartDependencies {
  management: ManagementStart;
}

export class RollupPlugin implements Plugin {
  setup(
    core: CoreSetup,
    {
      __LEGACY: {
        aggTypeFilters,
        aggTypeFieldFilters,
        editorConfigProviders,
        addSearchStrategy,
        management: managementLegacy,
        addBadgeExtension,
        addToggleExtension,
      },
      home,
    }: RollupPluginSetupDependencies
  ) {
    setFatalErrors(core.fatalErrors);
    addBadgeExtension(rollupBadgeExtension);
    addToggleExtension(rollupToggleExtension);

    const isRollupIndexPatternsEnabled = core.uiSettings.get(CONFIG_ROLLUPS);

    if (isRollupIndexPatternsEnabled) {
      managementLegacy.indexPattern.creation.add(RollupIndexPatternCreationConfig);
      managementLegacy.indexPattern.list.add(RollupIndexPatternListConfig);
      addSearchStrategy(getRollupSearchStrategy(core.http.fetch));
      initAggTypeFilter(aggTypeFilters);
      initAggTypeFieldFilter(aggTypeFieldFilters);
      initEditorConfig(editorConfigProviders);
    }

    if (home) {
      home.featureCatalogue.register({
        id: 'rollup_jobs',
        title: 'Rollups',
        description: i18n.translate('xpack.rollupJobs.featureCatalogueDescription', {
          defaultMessage:
            'Summarize and store historical data in a smaller index for future analysis.',
        }),
        icon: 'indexRollupApp',
        path: `#${CRUD_APP_BASE_PATH}/job_list`,
        showOnHomePage: true,
        category: FeatureCatalogueCategory.ADMIN,
      });
    }
  }

  start(core: CoreStart, { management }: RollupPluginStartDependencies) {
    setHttp(core.http);
    setNotifications(core.notifications);
    setEsBaseAndXPackBase(core.docLinks.ELASTIC_WEBSITE_URL, core.docLinks.DOC_LINK_VERSION);

    const esSection = management.sections.getSection('elasticsearch');

    const I18nContext = core.i18n.Context;

    esSection!.registerApp({
      id: 'rollup_jobs',
      title: i18n.translate('xpack.rollupJobs.appTitle', { defaultMessage: 'Rollup Jobs' }),
      order: 3,
      mount(params) {
        params.setBreadcrumbs([
          {
            text: i18n.translate('xpack.rollupJobs.breadcrumbsTitle', {
              defaultMessage: 'Rollup Jobs',
            }),
          },
        ]);

        render(
          <Router>
            <I18nContext>
              <KibanaContextProvider
                services={{
                  setBreadcrumbs: params.setBreadcrumbs,
                }}
              >
                <Provider store={rollupJobsStore}>
                  <App />
                </Provider>
              </KibanaContextProvider>
            </I18nContext>
          </Router>,
          params.element
        );

        return () => {
          unmountComponentAtNode(params.element);
        };
      },
    });
  }
}
