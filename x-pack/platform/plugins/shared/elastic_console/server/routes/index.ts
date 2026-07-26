/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { registerChatCompletionsRoute } from './chat_completions';
import { registerConversationRoutes } from './conversations';
import { registerModelsRoute } from './models';
import { registerSetupRoute } from './setup';

export const registerRoutes = ({
  router,
  coreSetup,
  logger,
  cloud,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
  cloud?: CloudSetup;
}) => {
  registerChatCompletionsRoute({ router, coreSetup, logger });
  registerConversationRoutes({ router, coreSetup, logger });
  registerModelsRoute({ router, coreSetup, logger });
  registerSetupRoute({ router, coreSetup, logger, cloud });
};
