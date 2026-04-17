/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import type { ElasticConsoleConfig } from '../config';
import type { ElasticConsolePluginStart, ElasticConsoleStartDependencies } from '../types';
import { registerChatCompletionsRoute } from './chat_completions';
import { registerConversationRoutes } from './conversations';
import { registerConversationSessionRoutes } from './conversation_sessions';
import { registerModelsRoute } from './models';
import { registerSetupRoute } from './setup';
import { registerSlackEventsRoute } from './slack_events';
import { registerSlackConnectRoute } from './slack_connect';
import { registerSlackTokenRoute } from './slack_token';
import { registerSlackLinkUserRoutes } from './slack_link_user';
import { registerSlackStatusRoute } from './slack_status';
import { registerSlackDisconnectRoute } from './slack_disconnect';

export const registerRoutes = ({
  router,
  coreSetup,
  logger,
  cloud,
  config,
}: {
  router: IRouter;
  coreSetup: CoreSetup<ElasticConsoleStartDependencies, ElasticConsolePluginStart>;
  logger: Logger;
  cloud?: CloudSetup;
  config: ElasticConsoleConfig;
}) => {
  registerChatCompletionsRoute({ router, coreSetup, logger });
  registerConversationRoutes({ router, coreSetup, logger });
  registerConversationSessionRoutes({ router, coreSetup, logger });
  registerModelsRoute({ router, coreSetup, logger });
  registerSetupRoute({ router, coreSetup, logger, cloud });
  registerSlackEventsRoute({ router, coreSetup, logger });
  registerSlackConnectRoute({ router, coreSetup, logger, config });
  registerSlackTokenRoute({ router, coreSetup, logger });
  registerSlackLinkUserRoutes({ router, coreSetup, logger });
  registerSlackStatusRoute({ router, coreSetup, logger });
  registerSlackDisconnectRoute({ router, coreSetup, logger });
};
