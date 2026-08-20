/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core/server';

import { FleetError } from '../../../../errors';
import {
  MAX_CONCURRENT_COMPONENT_TEMPLATES,
  USER_SETTINGS_TEMPLATE_SUFFIX,
} from '../../../../constants';
import { appContextService } from '../../..';

export const deleteComponentTemplates = async (
  esClient: ElasticsearchClient,
  componentTemplateIds: string[],
  options?: { packageName?: string }
) => {
  const logger = appContextService.getLogger();
  if (componentTemplateIds.length) {
    logger.info(`Deleting currently installed component template ids ${componentTemplateIds}`);
  }
  await pMap(
    componentTemplateIds,
    async (componentTemplateId) => {
      const deleted = await deleteComponentTemplate(
        esClient,
        componentTemplateId,
        options?.packageName
      );
      if (deleted) {
        logger.info(`Deleted: ${componentTemplateId}`);
      }
    },
    {
      concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES,
    }
  );
};

async function deleteComponentTemplate(
  esClient: ElasticsearchClient,
  name: string,
  packageName?: string
): Promise<boolean> {
  // '*' shouldn't ever appear here, but it still would delete all templates
  if (name && name !== '*' && !name.endsWith(USER_SETTINGS_TEMPLATE_SUFFIX)) {
    try {
      if (packageName) {
        const existing = await esClient.cluster.getComponentTemplate({ name }, { ignore: [404] });
        const template = existing?.component_templates?.[0]?.component_template as
          | { _meta?: { package?: { name?: string } } }
          | undefined;
        if (!template) {
          return false;
        }
        const owner = template._meta?.package?.name;
        // An existing template without owner metadata is unproven, not ours to delete.
        if (owner !== packageName) {
          appContextService
            .getLogger()
            .info(
              owner
                ? `Skipping delete of component template ${name}: owned by package "${owner}", not "${packageName}"`
                : `Skipping delete of component template ${name}: missing package owner metadata`
            );
          return false;
        }
      }
      await esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });
      return true;
    } catch (error) {
      throw new FleetError(`Error deleting component template ${name}: ${error.message}`);
    }
  }
  return false;
}
