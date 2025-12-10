/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';
import type { LogsSharedServerPluginSetupDeps, LogsSharedServerPluginStartDeps } from '../../types';

export function registerDataProviders({
  core,
  plugins,
  logger,
}: {
  core: CoreSetup<LogsSharedServerPluginStartDeps>;
  plugins: LogsSharedServerPluginSetupDeps;
  logger: Logger;
}) {
  const { observabilityAgentBuilder } = plugins;
  if (!observabilityAgentBuilder) {
    return;
  }

  observabilityAgentBuilder.registerDataProvider(
    'getLogDocumentById',
    async ({ request, index, id }) => {
      const [coreStart, pluginStart] = await core.getStartServices();
      const esClient = coreStart.elasticsearch.client.asScoped(request);
      return await pluginStart.logsDataAccess.services.getLogDocumentById({
        esClient: esClient.asCurrentUser,
        index,
        id,
      });
    }
  );
}
