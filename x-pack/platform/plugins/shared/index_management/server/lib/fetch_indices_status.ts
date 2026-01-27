/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type { SecurityHasPrivilegesResponse } from '@elastic/elasticsearch/lib/api/types';

export async function fetchUserStartPrivileges(
  client: ElasticsearchClient,
  indexName: string
): Promise<SecurityHasPrivilegesResponse> {
  return await client.security.hasPrivileges({
    index: [
      {
        names: [indexName],
        privileges: ['manage'],
      },
    ],
  });
}
