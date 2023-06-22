/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

export function installTemplate(
  client: Client,
  template: object,
  namespace: string,
  logger: ToolingLog
) {
  logger.debug(`installTemplate > template name: kbn-data-forge-${namespace}`);
  return client.indices
    .putTemplate({ name: `kbn-data-forge-${namespace}`, body: template })
    .catch((error: any) => logger.error(`installTemplate > ${JSON.stringify(error)}`));
}

export function deleteTemplate(client: Client, namespace: string, logger: ToolingLog) {
  logger.debug(`deleteTemplate > template name: kbn-data-forge-${namespace}`);
  return client.indices
    .deleteTemplate({ name: `kbn-data-forge-${namespace}` })
    .catch((error: any) => logger.error(`deleteTemplate > ${JSON.stringify(error)}`));
}
