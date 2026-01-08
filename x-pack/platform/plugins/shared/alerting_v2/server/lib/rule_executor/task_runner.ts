/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';

import type { PluginConfig } from '../../config';
import type { AlertingServerStartDependencies } from '../../types';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { RuleSavedObjectAttributes } from '../../saved_objects';
import { spaceIdToNamespace } from '../space_id_to_namespace';
import type { RuleExecutorTaskParams } from './types';
import { executeEsqlRule } from './execute_esql';
import { ALERT_EVENTS_INDEX } from './constants';
import { writeEsqlAlerts } from './write_alerts';
import type { AlertingResourcesService } from '../services/alerting_resources_service';

export function createRuleExecutorTaskRunner({
  logger,
  coreStartServices,
  config,
  resourcesService,
}: {
  logger: Logger;
  coreStartServices: Promise<[CoreStart, AlertingServerStartDependencies, unknown]>;
  config: PluginConfig;
  resourcesService: AlertingResourcesService;
}) {
  return ({ taskInstance, abortController, fakeRequest }: RunContext) => {
    return {
      async run() {
        if (!config.enabled) {
          return { state: taskInstance.state };
        }

        if (!fakeRequest) {
          throw new Error(
            `Cannot execute rule executor task without Task Manager fakeRequest. Ensure the task is scheduled with an API key (task id: ${taskInstance.id})`
          );
        }

        const params = taskInstance.params as RuleExecutorTaskParams;
        // Wait for the plugin-wide resource initialization started during plugin setup.
        await resourcesService.waitUntilReady();

        const [coreStart, pluginsStart] = await coreStartServices;

        const namespace: string | undefined = spaceIdToNamespace(
          pluginsStart.spaces,
          params.spaceId
        );

        let ruleAttributes: RuleSavedObjectAttributes;
        try {
          const soClient = coreStart.savedObjects.getScopedClient(fakeRequest, {
            includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
          });
          const doc = await soClient.get<RuleSavedObjectAttributes>(
            RULE_SAVED_OBJECT_TYPE,
            params.ruleId,
            {
              namespace,
            }
          );
          ruleAttributes = doc.attributes;
        } catch (e) {
          if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
            // Rule was deleted.
            return { state: taskInstance.state };
          }
          throw e;
        }

        logger.debug(
          () => `Rule saved object attributes: ${JSON.stringify(ruleAttributes, null, 2)}`
        );

        if (!ruleAttributes.enabled) {
          return { state: taskInstance.state };
        }

        const searchClient = pluginsStart.data.search.asScoped(fakeRequest);
        const esqlResponse = await executeEsqlRule({
          logger,
          searchClient,
          abortController,
          rule: {
            id: params.ruleId,
            spaceId: params.spaceId,
            name: ruleAttributes.name,
          },
          params: {
            query: ruleAttributes.query,
            timeField: ruleAttributes.timeField,
            lookbackWindow: ruleAttributes.lookbackWindow,
          },
        });

        logger.debug(
          () => `ES|QL response values: ${JSON.stringify(esqlResponse.values, null, 2)}`
        );

        const esClient = coreStart.elasticsearch.client.asInternalUser;
        const targetDataStream = ALERT_EVENTS_INDEX;

        const scheduledAt = taskInstance.scheduledAt;
        const scheduledTimestamp =
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
            ruleAttributes,
            esqlResponse,
            scheduledTimestamp,
          },
        });

        logger.debug(
          `alerting_v2:esql run: ruleId=${params.ruleId} spaceId=${params.spaceId} alertsDataStream=${targetDataStream}`
        );

        return { state: {} };
      },
    };
  };
}
