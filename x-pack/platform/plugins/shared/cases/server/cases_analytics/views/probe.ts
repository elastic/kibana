/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { errors as EsErrors } from '@elastic/elasticsearch';

/**
 * Detects whether the connected Elasticsearch supports the `_query/view`
 * REST API. ES|QL views are gated by transport version + node feature on
 * the ES side; older clusters and serverless return 404 today.
 *
 * This is the single source of truth for the analytics-mode branch in
 * `plugin.ts`: a `false` result keeps the cases plugin on the legacy
 * reindex pipeline, a `true` result flips it to the views path (subject
 * to the `xpack.cases.analytics.views.enabled` config flag).
 *
 * Any error other than a 404 is treated as "not supported" so a transient
 * cluster issue does not silently break the existing analytics path.
 */
export const probeViewSupport = async (
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<boolean> => {
  try {
    await esClient.transport.request(
      { method: 'GET', path: '/_query/view' },
      { meta: true }
    );
    return true;
  } catch (error) {
    if (error instanceof EsErrors.ResponseError && error.statusCode === 404) {
      logger.debug(
        'ES|QL views not supported by the connected cluster; falling back to the legacy analytics indices path'
      );
      return false;
    }
    logger.warn(
      `Failed to probe ES|QL view support; falling back to the legacy analytics indices path: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return false;
  }
};
