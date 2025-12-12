/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type {
  FleetRequestHandler,
  PutSettingsRequestSchema,
  PutSpaceSettingsRequestSchema,
} from '../../types';
import { appContextService, settingsService } from '../../services';
import { getSpaceSettings, saveSpaceSettings } from '../../services/spaces/space_settings';
import { scheduleReindexIntegrationKnowledgeTask } from '../../tasks/reindex_integration_knowledge_task';

export const getSpaceSettingsHandler: FleetRequestHandler = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;
  const settings = await getSpaceSettings(soClient.getCurrentNamespace());
  const body = {
    item: settings,
  };
  return response.ok({ body });
};

export const putSpaceSettingsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutSpaceSettingsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;
  await saveSpaceSettings({
    settings: {
      allowed_namespace_prefixes: request.body.allowed_namespace_prefixes,
    },
    spaceId: soClient.getCurrentNamespace(),
  });
  const settings = await getSpaceSettings(soClient.getCurrentNamespace());
  const body = {
    item: settings,
  };
  return response.ok({ body });
};

export const getSettingsHandler: FleetRequestHandler = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;

  try {
    const settings = await settingsService.getSettings(soClient);
    const body = {
      item: settings,
    };
    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Settings not found` },
      });
    }

    throw error;
  }
};

export const putSettingsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PutSettingsRequestSchema.body>
> = async (context, request, response) => {
  const soClient = (await context.fleet).internalSoClient;

  try {
    const settings = await settingsService.saveSettings(soClient, request.body);

    if (request.body.integration_knowledge_enabled) {
      await scheduleReindexIntegrationKnowledgeTask(appContextService.getTaskManagerStart()!);
    }

    const body = {
      item: settings,
    };
    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: `Settings not found` },
      });
    }

    throw error;
  }
};
