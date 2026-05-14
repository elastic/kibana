/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IlmPolicy } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/logging';
import { ILM_POLICY_NAME } from './constants';

/**
 * Default ILM policy for `.kibana_change_history`.
 *
 * Indefinite retention: a single `hot` phase with no actions (no rollover, no
 * delete). The policy exists as an edit point so cluster admins can introduce
 * rollover / retention through the Kibana ILM UI or the Elasticsearch ILM API
 * without Kibana having to redeploy.
 */
export const ILM_POLICY: IlmPolicy = {
  _meta: { managed: true },
  phases: {
    hot: {
      actions: {},
    },
  },
};

/**
 * Install the change history ILM policy iff it does not already exist.
 *
 * Calling `putLifecycle` unconditionally would silently overwrite any admin
 * customization on every Kibana startup, which contradicts the "admins can
 * edit the policy in place" guarantee documented in the package README.
 */
export async function ensureIlmPolicy(
  elasticsearchClient: ElasticsearchClient,
  logger: Logger
): Promise<void> {
  if (await ilmPolicyExists(elasticsearchClient)) {
    logger.debug(`ILM policy ${ILM_POLICY_NAME} already exists; leaving it as-is.`);
    return;
  }
  logger.debug(`Installing ILM policy ${ILM_POLICY_NAME} for change history data stream.`);
  await elasticsearchClient.ilm.putLifecycle({
    name: ILM_POLICY_NAME,
    policy: ILM_POLICY,
  });
}

async function ilmPolicyExists(elasticsearchClient: ElasticsearchClient): Promise<boolean> {
  try {
    await elasticsearchClient.ilm.getLifecycle({ name: ILM_POLICY_NAME });
    return true;
  } catch (error) {
    if (error?.meta?.statusCode === 404) {
      return false;
    }
    throw error;
  }
}
