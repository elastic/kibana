/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/server';

import type { IngestPipelinesConfigType } from './config';
import { ApiRoutes } from './routes';
import { handleEsError } from './shared_imports';
import type { Dependencies } from './types';
import {
  APP_CAPABILITIES,
  APP_CLUSTER_REQUIRED_PRIVILEGE,
  MANAGE_PROCESSORS_CLUSTER_REQUIRED_PRIVILEGE,
  PLUGIN_ID,
} from '../common/constants';

export class IngestPipelinesPlugin implements Plugin<void, void, any, any> {
  private readonly apiRoutes: ApiRoutes;
  private readonly config: IngestPipelinesConfigType;

  constructor(initContext: PluginInitializerContext<IngestPipelinesConfigType>) {
    this.apiRoutes = new ApiRoutes();
    this.config = initContext.config.get();
  }

  public setup({ http }: CoreSetup, { security, features }: Dependencies) {
    const router = http.createRouter();

    features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      management: {
        ingest: [PLUGIN_ID],
      },
      privileges: [
        {
          ui: [APP_CAPABILITIES.manage],
          requiredClusterPrivileges: [APP_CLUSTER_REQUIRED_PRIVILEGE],
        },
        {
          ui: [APP_CAPABILITIES.manageProcessors],
          requiredClusterPrivileges: [MANAGE_PROCESSORS_CLUSTER_REQUIRED_PRIVILEGE],
        },
      ],
    });

    this.apiRoutes.setup({
      router,
      config: {
        isSecurityEnabled: () => security !== undefined && security.license.isEnabled(),
        enableManageProcessors: this.config.enableManageProcessors !== false,
      },
      lib: {
        handleEsError,
      },
    });
  }

  public start() {}

  public stop() {}
}
