/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';

import type { UserStartPrivilegesResponse } from './types';

export async function fetchUserStartPrivileges(
  client: ElasticsearchClient,
  indexName: string
): Promise<UserStartPrivilegesResponse> {
  try {
    const securityCheck = await client.security.hasPrivileges({
      cluster: ['manage_api_key'],
      index: [
        {
          names: [indexName],
          privileges: ['manage', 'delete'],
        },
      ],
    });

    return {
      privileges: {
        canManageIndex: securityCheck?.index?.[indexName]?.manage ?? false,
      },
    };
  } catch (e) {
    return {
      privileges: {
        canManageIndex: false,
      },
    };
  }
}
