/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { alertIndexName, metricsTemplateName } from './config';

/**
 * Only ever touches this seed's own namespace, which is why the seed does not write
 * to `-default`: a real EDOT collector's data streams can never be caught by this.
 */
export const cleanSeed = async (
  client: Client,
  namespace: string,
  log: ToolingLog
): Promise<void> => {
  const dataStreams = `metrics-*.otel-${namespace},logs-*.otel-${namespace}`;
  await client.indices.deleteDataStream({ name: dataStreams }, { ignore: [404] });
  log.info(`Deleted data streams ${dataStreams}`);

  await client.indices.delete({ index: alertIndexName(namespace) }, { ignore: [404] });
  log.info(`Deleted index ${alertIndexName(namespace)}`);

  await client.indices.deleteIndexTemplate(
    { name: metricsTemplateName(namespace) },
    { ignore: [404] }
  );
  log.info(`Deleted index template ${metricsTemplateName(namespace)}`);
};
