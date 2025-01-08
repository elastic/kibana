/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { IndexTemplateDef } from '../data_sources/fake_hosts/index_template_def';

export async function installTemplate(
  client: Client,
  template: IndexTemplateDef,
  namespace: string,
  logger: ToolingLog
) {
  logger.info(`Installing index templates (${namespace})`);
  const componentNames = template.components.map(({ name }) => name);
  logger.info(`Installing components for ${template.namespace} (${componentNames})`);
  for (const component of template.components) {
    await client.cluster
      .putComponentTemplate({
        name: component.name,
        ...component.template,
      })
      .catch((error) => logger.error(`Failed installing component > ${JSON.stringify(error)}`));
  }
  logger.info(`Installing index template (${template.namespace})`);
  await client.indices
    .putIndexTemplate({
      name: template.namespace,
      ...template.template,
    })
    .catch((error) => logger.error(`Failed installing template > ${JSON.stringify(error)}`));
}

export async function deleteTemplate(
  client: Client,
  template: IndexTemplateDef,
  logger: ToolingLog
) {
  logger.info(`deleteIndexTemplate > template name: ${template.namespace}`);
  await client.indices
    .deleteIndexTemplate({
      name: template.namespace,
    })
    .catch((error: any) =>
      logger.error(`deleteIndexTemplate > ${template.namespace} ${JSON.stringify(error)}`)
    );
  for (const component of template.components) {
    logger.info(`deleteComponents > component name: ${component.name}`);
    await client.cluster
      .deleteComponentTemplate({ name: component.name })
      .catch((error: any) =>
        logger.error(`deleteComponents > ${component.name} ${JSON.stringify(error)}`)
      );
  }
}
