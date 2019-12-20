/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { EditorConfigProviderRegistry } from 'ui/vis/editors/config/editor_config_providers';
import { SearchStrategyProvider } from 'ui/courier/search_strategy/types';
import { ManagementSetup } from '../../../../../src/legacy/core_plugins/management/public/np_ready';
import { rollupBadgeExtension, rollupToggleExtension } from './extend_index_management';
// @ts-ignore
import { RollupIndexPatternCreationConfig } from './index_pattern_creation/rollup_index_pattern_creation_config';
// @ts-ignore
import { RollupIndexPatternListConfig } from './index_pattern_list/rollup_index_pattern_list_config';
// @ts-ignore
import { rollupSearchStrategy } from './search/rollup_search_strategy';
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

export interface RollupPluginSetupDependencies {
  __LEGACY: {
    aggTypeFilters: any;
    aggTypeFieldFilters: any;
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
  __LEGACY: {
    // TODO this becomes part of the management section register function as soon as
    // the API is ready
    registerRollupApp: (renderFunction: (element: HTMLElement) => void) => () => void;
  };
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
        management,
        addBadgeExtension,
        addToggleExtension,
      },
      home,
    }: RollupPluginSetupDependencies
  ) {
    addBadgeExtension(rollupBadgeExtension);
    addToggleExtension(rollupToggleExtension);

    const isRollupIndexPatternsEnabled = core.uiSettings.get(CONFIG_ROLLUPS);

    if (isRollupIndexPatternsEnabled) {
      management.indexPattern.creation.add(RollupIndexPatternCreationConfig);
      management.indexPattern.list.add(RollupIndexPatternListConfig);
      addSearchStrategy(rollupSearchStrategy);
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

  start(
    core: CoreStart,
    { management, __LEGACY: { registerRollupApp } }: RollupPluginStartDependencies
  ) {
    const esSection = management.legacy.getSection('elasticsearch');

    esSection.register('rollup_jobs', {
      visible: true,
      display: i18n.translate('xpack.rollupJobs.appTitle', { defaultMessage: 'Rollup Jobs' }),
      order: 3,
      url: `#${CRUD_APP_BASE_PATH}/job_list`,
    });

    const I18nContext = core.i18n.Context;

    registerRollupApp(elem => {
      render(
        <I18nContext>
          <KibanaContextProvider
            services={{
              http: core.http,
              notifications: core.notifications,
              chrome: core.chrome,
            }}
          >
            <Provider store={rollupJobsStore}>
              <App />
            </Provider>
          </KibanaContextProvider>
        </I18nContext>,
        elem
      );

      return () => {
        unmountComponentAtNode(elem);
      };
    });
  }
}
