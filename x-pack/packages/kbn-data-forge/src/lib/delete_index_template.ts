/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { indexTemplates } from '../data_sources';
import { Config } from '../types';

export async function deleteIndexTemplate(config: Config, client: Client, logger: ToolingLog) {
  const namespace = config.indexing.dataset;
  const templates = indexTemplates[namespace];
  const templateNames = templates.map((templateDef) => templateDef.namespace).join(',');
  logger.info(`Deleteing index templates (${templateNames})`);

  try {
    for (const indexTemplateDef of templates) {
      logger.info(`Deleteing index template (${indexTemplateDef.namespace})`);
      await client.indices.deleteIndexTemplate({
        name: indexTemplateDef.namespace,
      });
      const componentNames = indexTemplateDef.components.map(({ name }) => name);
      logger.info(`Deleteing components for ${indexTemplateDef.namespace} (${componentNames})`);
      for (const component of indexTemplateDef.components) {
        await client.cluster.deleteComponentTemplate({ name: component.name });
      }
    }
  } catch (error: any) {
    logger.error(`Failed to delete ${JSON.stringify(error)}`);
  }
}
