/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { LlmGatewayPluginStart, LlmGatewayStartDependencies } from '../types';
import { registerChatCompletionsRoute } from './chat_completions';
import { registerModelsRoute } from './models';

export const registerRoutes = ({
  router,
  coreSetup,
  logger,
}: {
  router: IRouter;
  coreSetup: CoreSetup<LlmGatewayStartDependencies, LlmGatewayPluginStart>;
  logger: Logger;
}) => {
  registerChatCompletionsRoute({ router, coreSetup, logger });
  registerModelsRoute({ router, coreSetup, logger });
};
