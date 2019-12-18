/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
import { ManagementStart } from '../../../../../src/plugins/management/public';

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

  start(core: CoreStart, { management }: RollupPluginStartDependencies) {
    const esSection = management.legacy.getSection('elasticsearch');

    esSection.register('rollup_jobs', {
      visible: true,
      display: i18n.translate('xpack.rollupJobs.appTitle', { defaultMessage: 'Rollup Jobs' }),
      order: 3,
      url: `#${CRUD_APP_BASE_PATH}/job_list`,
    });
  }
}
