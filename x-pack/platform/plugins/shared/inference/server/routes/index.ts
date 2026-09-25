/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { CoreSetup, IRouter } from '@kbn/core/server';
import type { InferenceServerStart, InferenceStartDependencies } from '../types';
import type { RegexWorkerService } from '../chat_complete/anonymization/regex_worker_service';
import { registerChatCompleteRoute } from './chat_complete';
import { registerConnectorByIdRoute } from './connector_by_id';
import { registerConnectorsRoute } from './connectors';
import { registerPromptRoute } from './prompt';
import { registerReplacementsRoutes } from '../chat_complete/anonymization/replacements/replacements_routes';
import { registerEndpointsRoute } from './endpoints';
import { registerAnonymizationTestRoute } from './anonymization_test';

export const registerRoutes = ({
  router,
  logger,
  coreSetup,
  getRegexWorker,
}: {
  router: IRouter;
  logger: Logger;
  coreSetup: CoreSetup<InferenceStartDependencies, InferenceServerStart>;
  getRegexWorker: () => RegexWorkerService | undefined;
}) => {
  registerChatCompleteRoute({ router, coreSetup, logger: logger.get('chatComplete') });
  registerPromptRoute({ router, coreSetup, logger: logger.get('prompt') });
  registerConnectorsRoute({ router, coreSetup, logger: logger.get('connectors') });
  registerConnectorByIdRoute({ router, coreSetup, logger: logger.get('connectors') });
  registerReplacementsRoutes(router, logger.get('replacements'), {
    coreSetup,
  });
  registerEndpointsRoute({ router, coreSetup });
  registerAnonymizationTestRoute({
    router,
    coreSetup,
    logger: logger.get('anonymizationTest'),
    getRegexWorker,
  });
};
