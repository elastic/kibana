/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import Boom from '@hapi/boom';

import type {
  GetOneDownloadSourcesRequestSchema,
  PutDownloadSourcesRequestSchema,
  PostDownloadSourcesRequestSchema,
  DeleteDownloadSourcesRequestSchema,
} from '../../types';
import type {
  GetOneDownloadSourceResponse,
  DeleteDownloadSourceResponse,
  PutDownloadSourceResponse,
  GetDownloadSourceResponse,
  DownloadSource,
} from '../../../common/types';
import { downloadSourceService } from '../../services/download_source';
import { agentPolicyService } from '../../services';

// Support clearing auth via PUT requests
export type DownloadSourceWithNullableAuth = Partial<DownloadSource> & {
  auth?: DownloadSource['auth'] | null;
};

/**
 * Validates download source auth configuration.
 *
 * Allowed auth configurations:
 * - auth headers only (no credentials)
 * - username + password (together), optionally with headers (no api_key)
 * - api_key, optionally with headers (no username/password)
 * - auth: null (to clear all auth data)
 * - auth: undefined (no changes to auth)
 */
export function validateDownloadSource(downloadSource: DownloadSourceWithNullableAuth) {
  // For settings that can be stored as secrets, only allow either plain text or secret reference.
  if (downloadSource.ssl?.key && downloadSource.secrets?.ssl?.key) {
    throw Boom.badRequest('Cannot specify both ssl.key and secrets.ssl.key');
  }
  if (downloadSource.auth?.password && downloadSource.secrets?.auth?.password) {
    throw Boom.badRequest('Cannot specify both auth.password and secrets.auth.password');
  }
  if (downloadSource.auth?.api_key && downloadSource.secrets?.auth?.api_key) {
    throw Boom.badRequest('Cannot specify both auth.api_key and secrets.auth.api_key');
  }

  // Disallow setting both username/password and api_key authentication.
  const hasUsernameOrPassword =
    downloadSource.auth?.username ||
    downloadSource.auth?.password ||
    downloadSource.secrets?.auth?.password;
  const hasApiKey = downloadSource.auth?.api_key || downloadSource.secrets?.auth?.api_key;
  if (hasUsernameOrPassword && hasApiKey) {
    throw Boom.badRequest('Cannot specify both username/password and api_key authentication');
  }

  // Ensure username and password are provided together when username/password authentication is used.
  const hasUsername = !!downloadSource.auth?.username;
  const hasPassword = !!downloadSource.auth?.password || !!downloadSource.secrets?.auth?.password;
  if (hasUsername && !hasPassword) {
    throw Boom.badRequest('Username and password must be provided together');
  }
  if (hasPassword && !hasUsername) {
    throw Boom.badRequest('Username and password must be provided together');
  }
}

export const getDownloadSourcesHandler: RequestHandler = async (context, request, response) => {
  const downloadSources = await downloadSourceService.list();

  const body: GetDownloadSourceResponse = {
    items: downloadSources.items,
    page: downloadSources.page,
    perPage: downloadSources.perPage,
    total: downloadSources.total,
  };

  return response.ok({ body });
};

export const getOneDownloadSourcesHandler: RequestHandler<
  TypeOf<typeof GetOneDownloadSourcesRequestSchema.params>
> = async (context, request, response) => {
  try {
    const downloadSource = await downloadSourceService.get(request.params.sourceId);

    const body: GetOneDownloadSourceResponse = {
      item: downloadSource,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent binary source ${request.params.sourceId} not found` },
      });
    }

    throw error;
  }
};

export const putDownloadSourcesHandler: RequestHandler<
  TypeOf<typeof PutDownloadSourcesRequestSchema.params>,
  undefined,
  TypeOf<typeof PutDownloadSourcesRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const data = request.body as DownloadSourceWithNullableAuth;
  validateDownloadSource(data);

  try {
    await downloadSourceService.update(soClient, esClient, request.params.sourceId, data);
    const downloadSource = await downloadSourceService.get(request.params.sourceId);
    if (downloadSource.is_default) {
      await agentPolicyService.bumpAllAgentPolicies(esClient);
    } else {
      await agentPolicyService.bumpAllAgentPoliciesForDownloadSource(esClient, downloadSource.id);
    }
    const body: PutDownloadSourceResponse = {
      item: downloadSource,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Download source ${request.params.sourceId} not found` },
      });
    }

    throw error;
  }
};

export const postDownloadSourcesHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostDownloadSourcesRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const { id, auth, ...restData } = request.body;
  const data = { ...restData, ...(auth !== null && { auth }) };

  validateDownloadSource(data);

  const downloadSource = await downloadSourceService.create(soClient, esClient, data, { id });
  if (downloadSource.is_default) {
    await agentPolicyService.bumpAllAgentPolicies(esClient);
  }
  const body: GetOneDownloadSourceResponse = {
    item: downloadSource,
  };

  return response.ok({ body });
};

export const deleteDownloadSourcesHandler: RequestHandler<
  TypeOf<typeof DeleteDownloadSourcesRequestSchema.params>
> = async (context, request, response) => {
  try {
    await downloadSourceService.delete(request.params.sourceId);

    const body: DeleteDownloadSourceResponse = {
      id: request.params.sourceId,
    };

    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Agent binary source ${request.params.sourceId} not found` },
      });
    }

    throw error;
  }
};
