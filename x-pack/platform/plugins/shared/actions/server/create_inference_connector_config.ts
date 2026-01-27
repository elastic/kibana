/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceInferenceEndpointInfo } from '@elastic/elasticsearch/lib/api/types';

export const createInferenceConnectorConfig = (endpoint: InferenceInferenceEndpointInfo) => {
  // @ts-ignore metadata does not exist on the type definition - this will be added to the endpoint return info
  const { metadata } = endpoint;
  return {
    id: metadata.name.replace(/\s+|(?<=\d)\.(?=\d)/g, '-'),
    name: metadata.name,
    actionTypeId: '.inference',
    exposeConfig: true,
    config: {
      provider: 'elastic',
      taskType: endpoint.task_type ?? 'chat_completion',
      inferenceId: endpoint.inference_id,
      providerConfig: {
        model_id: endpoint.service_settings.model_id,
      },
    },
    secrets: {},
    isPreconfigured: true,
    isSystemAction: false,
    isConnectorTypeDeprecated: false,
    isDeprecated: false,
  };
};
