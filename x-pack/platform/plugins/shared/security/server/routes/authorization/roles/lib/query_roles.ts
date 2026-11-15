/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core/server';

const toRoleDescriptors = (
  roles: estypes.SecurityQueryRoleQueryRole[]
): Record<string, estypes.SecurityRoleDescriptor> =>
  Object.fromEntries(
    roles.map(({ name, ...role }) => [
      name,
      {
        ...role,
        cluster: role.cluster ?? [],
        indices: role.indices ?? [],
        applications: role.applications ?? [],
        run_as: role.run_as ?? [],
      },
    ])
  );

/**
 * Reads every role with the Query Role API, which unlike the Get Role API also returns predefined roles on Serverless.
 */
export const queryAllRoles = async (
  client: ElasticsearchClient
): Promise<Record<string, estypes.SecurityRoleDescriptor>> => {
  const roles: estypes.SecurityQueryRoleQueryRole[] = [];
  let searchAfter: estypes.SortResults | undefined;

  while (true) {
    const page = await client.security.queryRole({
      size: 1000,
      sort: [{ name: { order: 'asc' } }],
      ...(searchAfter ? { search_after: searchAfter } : {}),
    });
    roles.push(...page.roles);
    if (roles.length >= page.total || page.roles.length === 0) {
      return toRoleDescriptors(roles);
    }
    searchAfter = page.roles.at(-1)?._sort;
    if (!searchAfter?.length) {
      throw new Error('Missing sort values while querying roles');
    }
  }
};

/**
 * Reads one role by name with the Query Role API, which unlike the Get Role API also returns predefined roles on Serverless.
 */
export const queryRoleByName = async (
  client: ElasticsearchClient,
  name: string
): Promise<Record<string, estypes.SecurityRoleDescriptor>> => {
  const { roles } = await client.security.queryRole({ query: { term: { name } }, size: 1 });
  return toRoleDescriptors(roles);
};
