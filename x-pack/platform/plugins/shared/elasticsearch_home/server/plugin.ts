/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { CAN_MONITOR_ALL_INDICES_CAPABILITY, PLUGIN_ID } from '../common/constants';
import { registerDeploymentStatsRoute } from './routes/deployment_stats';
import { registerStarredDashboardsCountRoute } from './routes/starred_dashboards_count';
import { registerSearchSkills } from './skills/register_search_skills';
import type { ElasticsearchHomeServerSetupDependencies } from './types';

export class ElasticsearchHomePlugin
  implements Plugin<void, void, ElasticsearchHomeServerSetupDependencies>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    { agentBuilder, cloud, features }: ElasticsearchHomeServerSetupDependencies
  ) {
    // Exposes the vector count privilege as a UI capability so the home page can render that tile
    // before the stats request resolves. Declared as an Elasticsearch feature, which resolves it
    // within the privilege call Security already makes. The stats route authorizes the count.
    features.registerElasticsearchFeature({
      id: PLUGIN_ID,
      privileges: [
        {
          requiredClusterPrivileges: [],
          requiredIndexPrivileges: { '*': ['monitor'] },
          ui: [CAN_MONITOR_ALL_INDICES_CAPABILITY],
        },
      ],
    });

    registerSearchSkills({ agentBuilder, cloud, logger: this.logger });

    const router = core.http.createRouter();
    registerDeploymentStatsRoute(router, this.logger);
    registerStarredDashboardsCountRoute(router, this.logger);
  }

  public start() {}

  public stop() {}
}
