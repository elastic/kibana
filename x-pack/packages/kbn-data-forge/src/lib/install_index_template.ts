/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { isArray } from 'lodash';
import { indexTemplates } from '../data_sources';
import { Config } from '../types';

export async function installIndexTemplate(
  config: Config,
  client: Client,
  logger: ToolingLog
): Promise<void> {
  const namespace = config.indexing.dataset;
  const templates = indexTemplates[namespace];
  const templateNames = templates.map((templateDef) => templateDef.namespace).join(',');
  logger.info(`Installing index templates (${templateNames})`);
  for (const indexTemplateDef of templates) {
    const componentNames = indexTemplateDef.components.map(({ name }) => name);
    logger.info(`Installing components for ${indexTemplateDef.namespace} (${componentNames})`);
    for (const component of indexTemplateDef.components) {
      await client.cluster.putComponentTemplate({ name: component.name, ...component.template });
    }
    logger.info(`Installing index template (${indexTemplateDef.namespace})`);
    // Clone the template and add the base component name
    const template = { ...indexTemplateDef.template };
    if (isArray(template.composed_of)) {
      template.composed_of.push('kbn-data-forge_base');
    }
    await client.indices.putIndexTemplate({
      name: indexTemplateDef.namespace,
      body: template,
    });
  }
}
