/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, IRouter, Logger } from '@kbn/core/server';
import type { EncryptedSavedObjectsPluginStart } from '@kbn/encrypted-saved-objects-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';

import { createEsqlRuleRoute } from './apis/create/create_esql_rule_route';
import { updateEsqlRuleRoute } from './apis/update/update_esql_rule_route';

export function registerEsqlRuleRoutes({
  router,
  logger,
  coreStartServices,
}: {
  router: IRouter;
  logger: Logger;
  coreStartServices: Promise<
    [
      CoreStart,
      {
        taskManager: TaskManagerStartContract;
        spaces: SpacesPluginStart;
        encryptedSavedObjects: EncryptedSavedObjectsPluginStart;
        security?: SecurityPluginStart;
      },
      unknown
    ]
  >;
}) {
  createEsqlRuleRoute({ router, logger, coreStartServices });
  updateEsqlRuleRoute({ router, logger, coreStartServices });
}
