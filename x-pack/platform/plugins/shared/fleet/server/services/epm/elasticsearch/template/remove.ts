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
  componentTemplateIds: string[]
) => {
  const logger = appContextService.getLogger();
  if (componentTemplateIds.length) {
    logger.info(`Deleting currently installed component template ids ${componentTemplateIds}`);
  }
  await pMap(
    componentTemplateIds,
    async (componentTemplateId) => {
      await deleteComponentTemplate(esClient, componentTemplateId);
      logger.info(`Deleted: ${componentTemplateId}`);
    },
    {
      concurrency: MAX_CONCURRENT_COMPONENT_TEMPLATES,
    }
  );
};

async function deleteComponentTemplate(esClient: ElasticsearchClient, name: string): Promise<void> {
  // '*' shouldn't ever appear here, but it still would delete all templates
  if (name && name !== '*' && !name.endsWith(USER_SETTINGS_TEMPLATE_SUFFIX)) {
    try {
      await esClient.cluster.deleteComponentTemplate({ name }, { ignore: [404] });
    } catch (error) {
      throw new FleetError(`Error deleting component template ${name}: ${error.message}`);
    }
  }
}
