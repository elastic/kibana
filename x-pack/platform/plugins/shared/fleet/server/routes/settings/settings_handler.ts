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
import { syncNamespaceTemplates } from '../../services/package_policies';

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
  const spaceId = soClient.getCurrentNamespace();

  // Fetch old settings before saving to compute the diff
  const oldSettings = await getSpaceSettings(spaceId);

  await saveSpaceSettings({
    settings: {
      allowed_namespace_prefixes: request.body.allowed_namespace_prefixes,
      namespace_index_templates_enabled_for: request.body.namespace_index_templates_enabled_for,
    },
    spaceId,
  });

  const settings = await getSpaceSettings(spaceId);

  // Compute diff for namespace index templates opt-in list
  const oldList = oldSettings.namespace_index_templates_enabled_for;
  const newList = settings.namespace_index_templates_enabled_for;
  const addedNamespaces = newList.filter((ns) => !oldList.includes(ns));
  const removedNamespaces = oldList.filter((ns) => !newList.includes(ns));

  let namespaceTemplatesSummary;

  if (addedNamespaces.length > 0 || removedNamespaces.length > 0) {
    const esClient = appContextService.getInternalUserESClient();
    namespaceTemplatesSummary = await syncNamespaceTemplates({
      soClient,
      esClient,
      addedNamespaces,
      removedNamespaces,
    });
  }

  const body = {
    item: {
      ...settings,
      ...(namespaceTemplatesSummary
        ? { namespace_templates_summary: namespaceTemplatesSummary }
        : {}),
    },
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
