/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDefinition } from '@kbn/entities-schema';

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IlmPutLifecycleRequest } from '@elastic/elasticsearch/lib/api/types';
import { generateEntitiesResetILMPolicy } from './ilm_policies/reset_ilm_policy';
import { retryTransientEsErrors } from './helpers/retry';

export async function createAndInstallILMPolicies(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
): Promise<Array<{ type: 'template'; id: string }>> {
  const policies: Array<{ type: 'template'; id: string }> = [];

  const resetPolicy: IlmPutLifecycleRequest = generateEntitiesResetILMPolicy(definition);
  // Creates OR Updates the policy
  await esClient.ilm.putLifecycle(resetPolicy);
  policies.push({ type: 'template', id: resetPolicy.name });

  return policies;
}

export async function deleteILMPolicy(esClient: ElasticsearchClient, name: string, logger: Logger) {
  try {
    await retryTransientEsErrors(
        () => esClient.ilm.deleteLifecycle({ name }, { ignore: [404] }),
        { logger },
    );
  } catch (error: any) {
    logger.error(`Error deleting entity manager index ilm policy: ${error.message}`);
    throw error;
  }
}

export async function deleteILMPolicies(
  esClient: ElasticsearchClient,
  definition: EntityDefinition,
  logger: Logger
) {
  try {
    await Promise.all(
      (definition.installedComponents ?? [])
        .filter(({ type }) => type === 'ilm_policy')
        .map(({ id }) =>
          retryTransientEsErrors(
            () => esClient.ilm.deleteLifecycle({ name: id }, { ignore: [404] }),
            { logger }
          )
        )
    );
  } catch (error: any) {
    logger.error(`Error deleting entity manager index ilm policy: ${error.message}`);
    throw error;
  }
}
