/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import {
  UiamApiKeyProvisioningEntityType,
  UiamApiKeyProvisioningStatus,
} from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import type { AlertingUsage } from '../types';
import { parseAndLogError } from './parse_and_log_error';

interface Opts {
  esClient: ElasticsearchClient;
  savedObjectsIndex: string;
  logger: Logger;
}

type GetUiamProvisioningTelemetryResults = Pick<
  AlertingUsage,
  | 'count_uiam_api_key_provisioning_status_total'
  | 'count_uiam_api_key_provisioning_status_completed'
  | 'count_uiam_api_key_provisioning_status_failed'
  | 'count_uiam_api_key_provisioning_status_skipped'
> & {
  errorMessage?: string;
  hasErrors: boolean;
};

const zeroCounts = (): GetUiamProvisioningTelemetryResults => ({
  hasErrors: false,
  count_uiam_api_key_provisioning_status_total: 0,
  count_uiam_api_key_provisioning_status_completed: 0,
  count_uiam_api_key_provisioning_status_failed: 0,
  count_uiam_api_key_provisioning_status_skipped: 0,
});

function countFromStatusBuckets(
  buckets: ReadonlyArray<{ key: string | number; doc_count: number }>
): {
  completed: number;
  failed: number;
  skipped: number;
} {
  let completed = 0;
  let failed = 0;
  let skipped = 0;
  for (const bucket of buckets) {
    const key = String(bucket.key);
    if (key === UiamApiKeyProvisioningStatus.COMPLETED) {
      completed = bucket.doc_count;
    } else if (key === UiamApiKeyProvisioningStatus.FAILED) {
      failed = bucket.doc_count;
    } else if (key === UiamApiKeyProvisioningStatus.SKIPPED) {
      skipped = bucket.doc_count;
    }
  }
  return { completed, failed, skipped };
}

export async function getUiamApiKeyProvisioningStatusTelemetry({
  esClient,
  savedObjectsIndex,
  logger,
}: Opts): Promise<GetUiamProvisioningTelemetryResults> {
  try {
    const soType = UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE;
    const entityTypeField = `${soType}.entityType`;
    const statusField = `${soType}.status`;

    const query = {
      index: savedObjectsIndex,
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          filter: [
            { term: { type: soType } },
            { term: { [entityTypeField]: UiamApiKeyProvisioningEntityType.RULE } },
          ],
        },
      },
      aggs: {
        by_status: {
          terms: {
            field: statusField,
            size: 16,
          },
        },
      },
    };

    logger.debug(
      () => `query for getUiamApiKeyProvisioningStatusTelemetry - ${JSON.stringify(query)}`
    );
    const results = await esClient.search(query);

    const totalHits = results.hits.total;
    const total = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;

    const byStatusBuckets =
      (
        results.aggregations?.by_status as
          | { buckets?: Array<{ key: string | number; doc_count: number }> }
          | undefined
      )?.buckets ?? [];

    const { completed, failed, skipped } = countFromStatusBuckets(byStatusBuckets);

    return {
      hasErrors: false,
      count_uiam_api_key_provisioning_status_total: total,
      count_uiam_api_key_provisioning_status_completed: completed,
      count_uiam_api_key_provisioning_status_failed: failed,
      count_uiam_api_key_provisioning_status_skipped: skipped,
    };
  } catch (err) {
    const errorMessage = parseAndLogError(err, `getUiamApiKeyProvisioningStatusTelemetry`, logger);

    return {
      ...zeroCounts(),
      hasErrors: true,
      errorMessage,
    };
  }
}
