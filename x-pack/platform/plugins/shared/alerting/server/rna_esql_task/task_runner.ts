/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import { ESQLParamsSchema } from '@kbn/response-ops-rule-params/esql';

import type { AlertingConfig } from '../config';
import type { AlertingPluginsStart, AlertingServerStart } from '../plugin';
import { spaceIdToNamespace } from '../lib';
import type { RawRule } from '../saved_objects/schemas/raw_rule/latest';
import { getDecryptedRuleSo } from '../data/rule/methods/get_decrypted_rule_so';
import type { EsqlRulesTaskParams } from './types';
import { executeEsqlRule } from './execute_esql';
import { ensureAlertsDataStream, ensureAlertsResources } from './resources';
import { writeEsqlAlerts } from './write_alerts';

export function createEsqlRulesTaskRunner({
  logger,
  coreStartServices,
  config,
}: {
  logger: Logger;
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
  config: AlertingConfig;
}) {
  return ({ taskInstance, abortController, fakeRequest }: RunContext) => {
    return {
      async run() {
        if (!config.esqlRules.enabled) {
          return { state: taskInstance.state };
        }

        if (!fakeRequest) {
          throw new Error('Cannot execute a task without Kibana Request');
        }

        const params = taskInstance.params as EsqlRulesTaskParams;
        const [coreStart, pluginsStart, alertingStart] = await coreStartServices;

        const namespace: string | undefined = spaceIdToNamespace(
          pluginsStart.spaces,
          params.spaceId
        );
        const encryptedSavedObjectsClient = pluginsStart.encryptedSavedObjects.getClient({
          includedHiddenTypes: [],
        });

        let rawRule: RawRule;
        try {
          const ruleSo = await getDecryptedRuleSo({
            encryptedSavedObjectsClient,
            id: params.ruleId,
            savedObjectsGetOptions: { namespace },
          });
          rawRule = ruleSo.attributes;
        } catch (e) {
          if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
            // Rule was deleted; TODO: handle this case
            return { state: taskInstance.state };
          }
          throw e;
        }

        if (!rawRule.enabled) {
          return { state: taskInstance.state };
        }

        const rulesClient = await (alertingStart as AlertingServerStart).getRulesClientWithRequest(
          fakeRequest
        );
        const rule = await rulesClient.get({ id: params.ruleId });

        const esqlRuleParams = ESQLParamsSchema.validate(rule.params);
        const searchClient = pluginsStart.data.search.asScoped(fakeRequest);
        const esqlResponse = await executeEsqlRule({
          logger,
          searchClient,
          abortController,
          rule: {
            id: params.ruleId,
            alertTypeId: rule.alertTypeId,
            spaceId: params.spaceId,
            name: rule.name,
          },
          params: esqlRuleParams,
        });

        const esClient = coreStart.elasticsearch.client.asInternalUser;
        await ensureAlertsResources({
          logger,
          esClient,
          dataStreamPrefix: config.esqlRules.alertsDataStreamPrefix,
        });
        const targetDataStream = await ensureAlertsDataStream({
          logger,
          esClient,
          dataStreamPrefix: config.esqlRules.alertsDataStreamPrefix,
          spaceId: params.spaceId,
          spaces: pluginsStart.spaces,
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
            rawRule,
            esqlRuleParams,
            esqlResponse,
            taskRunKey,
          },
        });

        logger.debug(
          `alerting:esql skeleton run: ruleId=${params.ruleId} spaceId=${params.spaceId} alertsDataStream=${targetDataStream} type=${rawRule.alertTypeId}`
        );
        logger.debug(
          `alerting:esql esql execution: columns=${esqlResponse.columns?.length ?? 0} rows=${
            esqlResponse.values?.length ?? 0
          }`
        );

        return { state: taskInstance.state };
      },
    };
  };
}
