/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';

import type { AlertingV2Config } from '../config';
import type { AlertingServerStartDependencies } from '../types';
import { ESQL_RULE_SAVED_OBJECT_TYPE } from '../saved_objects';
import type { RawEsqlRule } from '../saved_objects';
import { spaceIdToNamespace } from '../lib/space_id_to_namespace';
import type { RuleExecutorTaskParams } from './types';
import { executeEsqlRule } from './execute_esql';
import { ensureAlertsDataStream, ensureAlertsResources } from './resources';
import { writeEsqlAlerts } from './write_alerts';

export function createRuleExecutorTaskRunner({
  logger,
  coreStartServices,
  config,
}: {
  logger: Logger;
  coreStartServices: Promise<[CoreStart, AlertingServerStartDependencies, unknown]>;
  config: AlertingV2Config;
}) {
  return ({ taskInstance, abortController, fakeRequest }: RunContext) => {
    return {
      async run() {
        if (!config.esqlRules.enabled) {
          return { state: taskInstance.state };
        }

        const params = taskInstance.params as RuleExecutorTaskParams;
        const [coreStart, pluginsStart] = await coreStartServices;

        const namespace: string | undefined = spaceIdToNamespace(
          pluginsStart.spaces,
          params.spaceId
        );

        const encryptedSavedObjectsClient = pluginsStart.encryptedSavedObjects.getClient({
          includedHiddenTypes: [ESQL_RULE_SAVED_OBJECT_TYPE],
        });

        let rawRule: RawEsqlRule;
        try {
          const decrypted =
            await encryptedSavedObjectsClient.getDecryptedAsInternalUser<RawEsqlRule>(
              ESQL_RULE_SAVED_OBJECT_TYPE,
              params.ruleId,
              { namespace }
            );
          rawRule = decrypted.attributes;
        } catch (e) {
          if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
            // Rule was deleted.
            return { state: taskInstance.state };
          }
          throw e;
        }

        if (!rawRule.enabled) {
          return { state: taskInstance.state };
        }

        // Task Manager will provide `fakeRequest` if the task has an apiKey + userScope.
        // We intentionally do not construct fake requests here; scheduling must pass a real request.
        if (!fakeRequest) {
          throw new Error(
            `Cannot execute rule executor task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
          );
        }

        const searchClient = pluginsStart.data.search.asScoped(fakeRequest);
        const esqlResponse = await executeEsqlRule({
          logger,
          searchClient,
          abortController,
          rule: {
            id: params.ruleId,
            spaceId: params.spaceId,
            name: rawRule.name,
          },
          params: {
            esql: rawRule.esql,
            timeField: rawRule.timeField,
            lookbackWindow: rawRule.lookbackWindow,
          },
        });

        const esClient = coreStart.elasticsearch.client.asInternalUser;
        await ensureAlertsResources({
          logger,
          esClient,
        });
        const targetDataStream = await ensureAlertsDataStream({
          logger,
          esClient,
        });

        const scheduledAt = taskInstance.scheduledAt;
        const taskRunKey =
          (typeof scheduledAt === 'string' ? scheduledAt : undefined) ??
          (taskInstance.startedAt instanceof Date
            ? taskInstance.startedAt.toISOString()
            : undefined) ??
          new Date().toISOString();

        await writeEsqlAlerts({
          services: { logger, esClient, dataStreamName: targetDataStream },
          input: {
            ruleId: params.ruleId,
            spaceId: params.spaceId,
            rawRule,
            esqlResponse,
            taskRunKey,
          },
        });

        logger.debug(
          `alerting_v2:esql run: ruleId=${params.ruleId} spaceId=${params.spaceId} alertsDataStream=${targetDataStream}`
        );

        return { state: taskInstance.state };
      },
    };
  };
}
