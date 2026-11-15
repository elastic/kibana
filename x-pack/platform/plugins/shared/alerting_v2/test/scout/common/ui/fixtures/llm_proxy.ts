/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutLogger } from '@kbn/scout';
import { createLlmProxy, type LlmProxy } from '@kbn/ftr-llm-proxy';
import type { AlertingApiServicesFixture } from '../../alerting_api_services';

export interface LlmProxyWorkerFixtures {
  llmProxy: LlmProxy;
}

/**
 * Starts an LLM proxy and a `.gen-ai` connector pointing at it for Agent Builder chats. The
 * connector is global to the cluster, so only the connector created here is deleted.
 */
export const provideLlmProxy = async (
  { apiServices, log }: { apiServices: AlertingApiServicesFixture; log: ScoutLogger },
  use: (proxy: LlmProxy) => Promise<void>
): Promise<void> => {
  const proxy = await createLlmProxy(log);
  let connectorId: string | undefined;
  try {
    ({ id: connectorId } = await apiServices.alerting.connectors.create({
      name: 'alerting-v2-llm-proxy',
      connectorTypeId: '.gen-ai',
      config: {
        apiProvider: 'OpenAI',
        apiUrl: `http://localhost:${proxy.getPort()}`,
        defaultModel: 'gpt-4',
      },
      secrets: { apiKey: 'myApiKey' },
    }));
    await use(proxy);
  } finally {
    proxy.close();
    if (connectorId) {
      await apiServices.alerting.connectors.delete(connectorId);
    }
  }
};
