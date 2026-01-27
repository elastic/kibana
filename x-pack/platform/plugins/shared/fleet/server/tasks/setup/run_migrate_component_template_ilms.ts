/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type { ClusterComponentTemplate } from '@elastic/elasticsearch/lib/api/types';

import { appContextService } from '../../services';
import {
  DATA_STREAM_TYPES_DEPRECATED_ILMS,
  getILMMigrationStatus,
  getILMPolicies,
  saveILMMigrationChanges,
} from '../../services/epm/elasticsearch/template/default_settings';
import { throwIfAborted } from '../utils';

export async function runMigrateComponentTemplateILMs(params: {
  abortController: AbortController;
  logger: Logger;
}) {
  const { logger, abortController } = params;
  const isILMPoliciesDisabled =
    appContextService.getConfig()?.internal?.disableILMPolicies ?? false;
  if (isILMPoliciesDisabled) {
    return;
  }

  const esClient = appContextService.getInternalUserESClient();
  const ilmMigrationStatusMap = await getILMMigrationStatus();
  const updatedILMMigrationStatusMap = new Map(ilmMigrationStatusMap);
  const ilmPolicies = await getILMPolicies(DATA_STREAM_TYPES_DEPRECATED_ILMS);

  for (const dataStreamType of DATA_STREAM_TYPES_DEPRECATED_ILMS) {
    throwIfAborted(abortController);

    const ilmPolicy = ilmPolicies.get(dataStreamType);
    // Migrate existing component templates if none of the ILM policies are modified or the migration was already done
    if (
      ((ilmPolicy?.deprecatedILMPolicy?.version ?? 1) > 1 ||
        (ilmPolicy?.newILMPolicy?.version ?? 1) > 1) &&
      ilmMigrationStatusMap.get(dataStreamType) !== 'success'
    ) {
      continue;
    }

    const componentTemplates = await esClient.cluster.getComponentTemplate(
      {
        name: `${dataStreamType}-*@package`,
      },
      {
        ignore: [404],
      }
    );
    for (const [, componentTemplate] of Object.entries(componentTemplates.component_templates)) {
      throwIfAborted(abortController);

      const settings = componentTemplate.component_template.template.settings ?? {};
      if (settings.index.lifecycle?.name === dataStreamType) {
        logger.info(
          `Component template ${componentTemplate.name} uses deprecated ILM policy, migrating to ${dataStreamType}@lifecycle`
        );
        await updateComponentTemplate(esClient, componentTemplate, dataStreamType);
        updatedILMMigrationStatusMap.set(dataStreamType, 'success');
      }
    }
  }
  await saveILMMigrationChanges(updatedILMMigrationStatusMap);
}

async function updateComponentTemplate(
  esClient: ElasticsearchClient,
  componentTemplate: ClusterComponentTemplate,
  dataStreamType: string
) {
  const settings = componentTemplate.component_template.template.settings ?? {};
  await esClient.cluster.putComponentTemplate({
    name: componentTemplate.name,
    template: {
      ...componentTemplate.component_template.template,
      settings: {
        ...settings,
        index: {
          ...settings.index,
          lifecycle: {
            ...settings.index.lifecycle,
            name: `${dataStreamType}@lifecycle`,
          },
        },
      },
    },
  });
}
