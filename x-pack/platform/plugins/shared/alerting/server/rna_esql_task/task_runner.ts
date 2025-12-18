/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { RunContext } from '@kbn/task-manager-plugin/server';
import type { FakeRawRequest, Headers } from '@kbn/core-http-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';

import type { AlertingConfig } from '../config';
import type { AlertingPluginsStart, AlertingServerStart } from '../plugin';
import { spaceIdToNamespace } from '../lib';
import type { RawRule } from '../saved_objects/schemas/raw_rule/latest';
import { getDecryptedRuleSo } from '../data/rule/methods/get_decrypted_rule_so';
import type { EsqlRulesTaskParams } from './types';
import { getEsqlRulesAlertsDataStreamName } from './lib';

function getFakeKibanaRequest({
  basePathService,
  spaceId,
  apiKey,
}: {
  basePathService: CoreStart['http']['basePath'];
  spaceId: string;
  apiKey: RawRule['apiKey'];
}) {
  const requestHeaders: Headers = {};
  if (apiKey) {
    requestHeaders.authorization = `ApiKey ${apiKey}`;
  }
  const fakeRawRequest: FakeRawRequest = {
    headers: requestHeaders,
    path: '/',
  };
  const fakeRequest = kibanaRequestFactory(fakeRawRequest);
  basePathService.set(fakeRequest, addSpaceIdToPath('/', spaceId));
  return fakeRequest;
}

export function createEsqlRulesTaskRunner({
  logger,
  coreStartServices,
  config,
}: {
  logger: Logger;
  coreStartServices: Promise<[CoreStart, AlertingPluginsStart, unknown]>;
  config: AlertingConfig;
}) {
  return ({ taskInstance }: RunContext) => {
    return {
      async run() {
        if (!config.esqlRules.enabled) {
          return { state: taskInstance.state };
        }

        const params = taskInstance.params as EsqlRulesTaskParams;
        const [coreStart, pluginsStart, alertingStart] = await coreStartServices;

        const namespace = spaceIdToNamespace(pluginsStart.spaces, params.spaceId);
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
          getFakeKibanaRequest({
            basePathService: coreStart.http.basePath,
            spaceId: params.spaceId,
            apiKey: rawRule.apiKey,
          })
        );
        await rulesClient.get({ id: params.ruleId });

        const targetDataStream = getEsqlRulesAlertsDataStreamName({
          config,
          spaceId: params.spaceId,
          spaces: pluginsStart.spaces,
        });

        logger.debug(
          `alerting:esql skeleton run: ruleId=${params.ruleId} spaceId=${params.spaceId} alertsDataStream=${targetDataStream} type=${rawRule.alertTypeId}`
        );

        // no ES|QL execution yet.
        return { state: taskInstance.state };
      },
    };
  };
}
