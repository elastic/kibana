/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';

import { PLUGIN } from '../common/constants/plugin';
import type { Dependencies } from './types';
import { ApiRoutes } from './routes';
import { handleEsError } from './shared_imports';
import type { IndexManagementConfig } from './config';

export class IndexMgmtServerPlugin implements Plugin<void, void, any, any> {
  private readonly apiRoutes: ApiRoutes;
  private readonly config: IndexManagementConfig;

  constructor(initContext: PluginInitializerContext) {
    this.apiRoutes = new ApiRoutes();
    this.config = initContext.config.get();
  }

  setup({ http }: CoreSetup, { features, security }: Dependencies) {
    features.registerElasticsearchFeature({
      id: PLUGIN.id,
      privileges: [
        {
          requiredClusterPrivileges: ['monitor_enrich'],
          ui: ['monitorEnrich'],
        },
        {
          requiredClusterPrivileges: ['manage_enrich'],
          ui: ['manageEnrich'],
        },
        {
          requiredClusterPrivileges: ['manage_index_templates'],
          ui: ['manageIndexTemplates'],
        },
        {
          // manage_index_templates is also required, but we will disable specific parts of the
          // UI if this privilege is missing.
          requiredClusterPrivileges: ['monitor'],
          ui: ['monitor'],
        },
      ],
    });

    this.apiRoutes.setup({
      router: http.createRouter(),
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
        isLegacyTemplatesEnabled: this.config.enableLegacyTemplates,
        isIndexStatsEnabled: this.config.enableIndexStats ?? true,
        isSizeAndDocCountEnabled: this.config.enableSizeAndDocCount ?? false,
        enableProjectLevelRetentionChecks: this.config.enableProjectLevelRetentionChecks ?? false,
        isDataStreamStatsEnabled: this.config.enableDataStreamStats,
        enableMappingsSourceFieldSection: this.config.enableMappingsSourceFieldSection,
        enableTogglingDataRetention: this.config.enableTogglingDataRetention,
        enableFailureStoreRetentionDisabling:
          this.config.enableFailureStoreRetentionDisabling ?? true,
      },
      lib: {
        handleEsError,
      },
    });
  }

  start() {}

  stop() {}
}
