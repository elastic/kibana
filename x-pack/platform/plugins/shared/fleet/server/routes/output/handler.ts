/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  DeleteOutputRequestSchema,
  GetLatestOutputHealthRequestSchema,
  GetOneOutputRequestSchema,
  PostOutputRequestSchema,
  PutOutputRequestSchema,
} from '../../types';
import type {
  DeleteOutputResponse,
  GetOneOutputResponse,
  GetOutputsResponse,
  NewOutput,
  PostLogstashApiKeyResponse,
  UpdateOutput,
} from '../../../common/types';
import { outputService } from '../../services/output';
import { FleetUnauthorizedError } from '../../errors';
import { agentPolicyService } from '../../services';
import { generateLogstashApiKey, canCreateLogstashApiKey } from '../../services/api_keys';

export const getOutputsHandler: RequestHandler = async (context, request, response) => {
  const outputs = await outputService.list();

  const body: GetOutputsResponse = {
    items: outputs.items,
    page: outputs.page,
    perPage: outputs.perPage,
    total: outputs.total,
  };

  return response.ok({ body });
};

export const getOneOutputHandler: RequestHandler<
  TypeOf<typeof GetOneOutputRequestSchema.params>
> = async (context, request, response) => {
  try {
    const output = await outputService.get(request.params.outputId);

    const body: GetOneOutputResponse = {
      item: output,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Output ${request.params.outputId} not found` },
      });
    }

    throw error;
  }
};

export const putOutputHandler: RequestHandler<
  TypeOf<typeof PutOutputRequestSchema.params>,
  undefined,
  TypeOf<typeof PutOutputRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  try {
    await outputService.update(
      soClient,
      esClient,
      request.params.outputId,
      request.body as UpdateOutput
    );
    const output = await outputService.get(request.params.outputId);
    await agentPolicyService.bumpAllAgentPoliciesForOutput(esClient, output.id, {
      isDefault: output.is_default,
      isDefaultMonitoring: output.is_default_monitoring,
    });

    const body: GetOneOutputResponse = {
      item: output,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Output ${request.params.outputId} not found` },
      });
    }

    throw error;
  }
};

export const postOutputHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostOutputRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { id, ...newOutput } = request.body;
  const output = await outputService.create(soClient, esClient, newOutput as NewOutput, { id });
  await agentPolicyService.bumpAllAgentPoliciesForOutput(esClient, output.id, {
    isDefault: output.is_default,
    isDefaultMonitoring: output.is_default_monitoring,
  });

  const body: GetOneOutputResponse = {
    item: output,
  };

  return response.ok({ body });
};

export const deleteOutputHandler: RequestHandler<
  TypeOf<typeof DeleteOutputRequestSchema.params>
> = async (context, request, response) => {
  try {
    await outputService.delete(request.params.outputId);

    const body: DeleteOutputResponse = {
      id: request.params.outputId,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Output ${request.params.outputId} not found` },
      });
    }

    throw error;
  }
};

export const postLogstashApiKeyHandler: RequestHandler = async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asCurrentUser;
  const hasCreatePrivileges = await canCreateLogstashApiKey(esClient);
  if (!hasCreatePrivileges) {
    throw new FleetUnauthorizedError('Missing permissions to create logstash API key');
  }

  const apiKey = await generateLogstashApiKey(esClient);

  const body: PostLogstashApiKeyResponse = {
    // Logstash expect the key to be formatted like this id:key
    api_key: `${apiKey.id}:${apiKey.api_key}`,
  };

  return response.ok({ body });
};

export const getLatestOutputHealth: RequestHandler<
  TypeOf<typeof GetLatestOutputHealthRequestSchema.params>
> = async (context, request, response) => {
  const esClient = (await context.core).elasticsearch.client.asInternalUser;
  const outputHealth = await outputService.getLatestOutputHealth(esClient, request.params.outputId);
  return response.ok({ body: outputHealth });
};
