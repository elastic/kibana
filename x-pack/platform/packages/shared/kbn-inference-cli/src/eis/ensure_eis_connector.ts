/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaClient } from '@kbn/kibana-api-cli';
import { ToolingLog } from '@kbn/tooling-log';
import { getConnectors } from '../get_connector';

class ElasticChatModelUnavailable extends Error {
  constructor() {
    super(`Elastic chat model is not available, and needed to install the inference connector`);
    super.name = 'ElasticChatModelUnavailable';
  }
}

export async function ensureEisConnector({
  kibanaClient,
  log,
  signal,
}: {
  kibanaClient: KibanaClient;
  log: ToolingLog;
  signal: AbortSignal;
}) {
  log.debug(`Fetching inference endpoints`);

  const { endpoints } = await kibanaClient.es.inference.get();

  const chatModelEndpoint = endpoints.find((endpoint) => {
    return endpoint.service === 'elastic' && (endpoint.task_type as string) === 'chat_completion';
  });

  if (!chatModelEndpoint) {
    throw new ElasticChatModelUnavailable();
  }

  log.debug(`Found chat model endpoint: ${chatModelEndpoint.inference_id}`);

  const existingConnector = await getConnectors(kibanaClient).then((connectors) =>
    connectors.find(
      (connector) =>
        connector.type === '.inference' &&
        connector.config.taskType === 'chat_completion' &&
        connector.config.provider === 'elastic'
    )
  );

  if (existingConnector) {
    log.debug(`Reusing existing connector`);
    return existingConnector.connectorId;
  }

  const response = await kibanaClient.fetch<{ id: string }>(`/api/actions/connector`, {
    method: 'POST',
    signal,
    body: {
      name: 'Elastic',
      connector_type_id: '.inference',
      config: {
        provider: 'elastic',
        taskType: 'chat_completion',
        inferenceId: chatModelEndpoint.inference_id,
        providerConfig: {
          model_id: chatModelEndpoint.service_settings.model_id as string,
        },
      },
    },
  });

  return response.id;
}
