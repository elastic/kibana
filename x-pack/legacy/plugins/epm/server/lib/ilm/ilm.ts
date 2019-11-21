/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Client } from 'elasticsearch';

/**
 * Calls the given esClient, creates and index and sets it as write index on the given alias.
 */
export async function createIndexWithAlias(esClient: Client, indexName: string, aliasName: string) {
  const body = getIndexWithWithAlias(aliasName);

  return esClient.indices.create({
    index: indexName,
    body,
  });
}

export function getIndexWithWithAlias(aliasName: string) {
  return {
    aliases: {
      [aliasName]: {
        is_write_index: true,
      },
    },
  };
}

/**
 * Returns the current default policy used for Beats.
 * This will later be replaced by the default policies.
 *
 * This policy will have to be pushed to PUT /_ilm/policy/{policy-name}
 */
export function getPolicy() {
  return {
    policy: {
      phases: {
        hot: {
          actions: {
            rollover: {
              max_size: '50gb',
              max_age: '30d',
            },
          },
        },
      },
    },
  };
}
