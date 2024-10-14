/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

export const deleteIndex = async ({
  indexName,
  client,
  log,
}: {
  indexName: string;
  client: Client;
  log: ToolingLog;
}) => {
  log.info(`Deleting index ${indexName}`);
  await client.indices.delete(
    {
      index: indexName,
    },
    { ignore: [404] }
  );
};
