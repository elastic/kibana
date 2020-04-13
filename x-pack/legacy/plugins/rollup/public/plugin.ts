/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin } from 'kibana/public';
import { PluginsStart } from './legacy_imports';
import { rollupBadgeExtension, rollupToggleExtension } from './extend_index_management';
// @ts-ignore
import { RollupIndexPatternCreationConfig } from './index_pattern_creation/rollup_index_pattern_creation_config';
// @ts-ignore
import { RollupIndexPatternListConfig } from './index_pattern_list/rollup_index_pattern_list_config';
// @ts-ignore
import { initAggTypeFilter } from './visualize/agg_type_filter';
// @ts-ignore
import { initAggTypeFieldFilter } from './visualize/agg_type_field_filter';
import { CONFIG_ROLLUPS } from '../common';
import {
  FeatureCatalogueCategory,
  HomePublicPluginSetup,
} from '../../../../../src/plugins/home/public';
// @ts-ignore
import { CRUD_APP_BASE_PATH } from './crud_app/constants';
import { ManagementSetup } from '../../../../../src/plugins/management/public';
import { IndexManagementPluginSetup } from '../../../../plugins/index_management/public';
import { IndexPatternManagementSetup } from '../../../../../src/plugins/index_pattern_management/public';
import { search } from '../../../../../src/plugins/data/public';
// @ts-ignore
import { setEsBaseAndXPackBase, setHttp } from './crud_app/services';
import { setNotifications, setFatalErrors } from './kibana_services';
import { renderApp } from './application';

export interface RollupPluginSetupDependencies {
  home?: HomePublicPluginSetup;
  management: ManagementSetup;
  indexManagement?: IndexManagementPluginSetup;
  indexPatternManagement: IndexPatternManagementSetup;
}

export class RollupPlugin implements Plugin {
  setup(
    core: CoreSetup,
    { home, management, indexManagement, indexPatternManagement }: RollupPluginSetupDependencies
  ) {
    setFatalErrors(core.fatalErrors);

    if (indexManagement) {
      indexManagement.extensionsService.addBadge(rollupBadgeExtension);
      indexManagement.extensionsService.addToggle(rollupToggleExtension);
    }

    const isRollupIndexPatternsEnabled = core.uiSettings.get(CONFIG_ROLLUPS);

    if (isRollupIndexPatternsEnabled) {
      indexPatternManagement.creation.addCreationConfig(RollupIndexPatternCreationConfig);
      indexPatternManagement.list.addListConfig(RollupIndexPatternListConfig);
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

    const esSection = management.sections.getSection('elasticsearch');
    if (esSection) {
      esSection.registerApp({
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

          return renderApp(core, params);
        },
      });
    }
  }

  start(core: CoreStart, plugins: PluginsStart) {
    setHttp(core.http);
    setNotifications(core.notifications);
    setEsBaseAndXPackBase(core.docLinks.ELASTIC_WEBSITE_URL, core.docLinks.DOC_LINK_VERSION);

    const isRollupIndexPatternsEnabled = core.uiSettings.get(CONFIG_ROLLUPS);

    if (isRollupIndexPatternsEnabled) {
      initAggTypeFilter(search.aggs.aggTypeFilters);
      initAggTypeFieldFilter(plugins.data.search.__LEGACY.aggTypeFieldFilters);
    }
  }
}
