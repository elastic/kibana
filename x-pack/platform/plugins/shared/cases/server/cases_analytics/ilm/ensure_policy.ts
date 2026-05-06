/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { CASES_DATA_ILM_POLICY_ID } from '../../../common/constants';
import { CASES_DATA_ILM_POLICY } from './policy';

/**
 * Idempotent put_lifecycle. Multiple Kibana nodes racing on cold start is fine —
 * `put_lifecycle` is itself idempotent on the ES side. Errors that look like
 * "policy already exists with this content" are swallowed at debug.
 */
export const ensureCasesDataIlmPolicy = async ({
  esClient,
  logger,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
}): Promise<void> => {
  try {
    await esClient.ilm.putLifecycle({
      name: CASES_DATA_ILM_POLICY_ID,
      policy: CASES_DATA_ILM_POLICY,
    });
    logger.debug(`cases.analytics ILM policy ${CASES_DATA_ILM_POLICY_ID} ensured`);
  } catch (err) {
    // Best-effort; the writer + reconciliation paths still work without the policy
    // (rollover just won't happen automatically). Log loudly enough that an operator
    // notices, but don't block plugin start.
    logger.warn(
      `cases.analytics: failed to ensure ILM policy ${CASES_DATA_ILM_POLICY_ID}: ${err.message}`
    );
  }
};
