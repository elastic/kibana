/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinition } from '@kbn/entities-schema';
import type {
  ClusterPutComponentTemplateRequest,
  IndicesPutIndexTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { entitiesLatestBaseComponentTemplateConfig } from '../templates/components/base_latest';
import { entitiesHistoryBaseComponentTemplateConfig } from '../templates/components/base_history';
import { entitiesEntityComponentTemplateConfig } from '../templates/components/entity';
import { entitiesEventComponentTemplateConfig } from '../templates/components/event';
import { retryTransientEsErrors } from './entities/helpers/retry';
import { generateEntitiesLatestIndexTemplateConfig } from './entities/templates/entities_latest_template';
import { generateEntitiesHistoryIndexTemplateConfig } from './entities/templates/entities_history_template';
import { generateEntitiesResetIndexTemplateConfig } from './entities/templates/entities_reset_template';

interface TemplateManagementOptions {
  esClient: ElasticsearchClient;
  template: IndicesPutIndexTemplateRequest;
  logger: Logger;
}

interface ComponentManagementOptions {
  esClient: ElasticsearchClient;
  component: ClusterPutComponentTemplateRequest;
  logger: Logger;
}

export const installEntityManagerTemplates = async ({
  esClient,
  logger,
  isServerless,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  isServerless: boolean;
}) => {
  await Promise.all([
    upsertComponent({
      esClient,
      logger,
      component: removeIlmInServerless(entitiesLatestBaseComponentTemplateConfig, isServerless),
    }),
    upsertComponent({
      esClient,
      logger,
      component: removeIlmInServerless(entitiesHistoryBaseComponentTemplateConfig, isServerless),
    }),
    upsertComponent({
      esClient,
      logger,
      component: removeIlmInServerless(entitiesEventComponentTemplateConfig, isServerless),
    }),
    upsertComponent({
      esClient,
      logger,
      component: removeIlmInServerless(entitiesEntityComponentTemplateConfig, isServerless),
    }),
  ]);
};

interface DeleteTemplateOptions {
  esClient: ElasticsearchClient;
  name: string;
  logger: Logger;
}

export async function upsertTemplate({ esClient, template, logger }: TemplateManagementOptions) {
  try {
    const result = await retryTransientEsErrors(() => esClient.indices.putIndexTemplate(template), {
      logger,
    });
    logger.debug(() => `Installed entity manager index template: ${JSON.stringify(template)}`);
    return result;
  } catch (error: any) {
    logger.error(`Error updating entity manager index template: ${error.message}`);
    throw error;
  }
}
export async function createAndInstallTemplates(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
): Promise<Array<{ type: 'template'; id: string }>> {
  const templates: Array<{ type: 'template'; id: string }> = [];

  const latestTemplate = generateEntitiesLatestIndexTemplateConfig(definition);
  await upsertTemplate({ esClient, template: latestTemplate, logger });
  templates.push({ type: 'template', id: latestTemplate.name });

  const historyTemplate = generateEntitiesHistoryIndexTemplateConfig(definition);
  await upsertTemplate({ esClient, template: historyTemplate, logger });
  templates.push({ type: 'template', id: historyTemplate.name });

  const resetTemplate = generateEntitiesResetIndexTemplateConfig(definition);
  await upsertTemplate({ esClient, template: resetTemplate, logger });
  templates.push({ type: 'template', id: resetTemplate.name });

  return templates;
}

export async function deleteTemplate({ esClient, name, logger }: DeleteTemplateOptions) {
  try {
    await retryTransientEsErrors(
      () => esClient.indices.deleteIndexTemplate({ name }, { ignore: [404] }),
      { logger }
    );
  } catch (error: any) {
    logger.error(`Error deleting entity manager index template: ${error.message}`);
    throw error;
  }
}

export async function deleteTemplates(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    await Promise.all(
      (definition.installedComponents ?? [])
        .filter(({ type }) => type === 'template')
        .map(({ id }) =>
          retryTransientEsErrors(
            () => esClient.indices.deleteIndexTemplate({ name: id }, { ignore: [404] }),
            { logger }
          )
        )
    );
  } catch (error: any) {
    logger.error(`Error deleting entity manager index template: ${error.message}`);
    throw error;
  }
}

export async function upsertComponent({ esClient, component, logger }: ComponentManagementOptions) {
  try {
    await retryTransientEsErrors(() => esClient.cluster.putComponentTemplate(component), {
      logger,
    });
    logger.debug(() => `Installed entity manager component template: ${JSON.stringify(component)}`);
  } catch (error: any) {
    logger.error(`Error updating entity manager component template: ${error.message}`);
    throw error;
  }
}

export function removeIlmInServerless(
  component: ClusterPutComponentTemplateRequest,
  isServerless: boolean
): ClusterPutComponentTemplateRequest {
  if (isServerless) {
    component.template.lifecycle = undefined;
    if (component.template.settings?.index !== undefined) {
      component.template.settings.index.lifecycle = undefined;
    }
  }
  return component;
}
