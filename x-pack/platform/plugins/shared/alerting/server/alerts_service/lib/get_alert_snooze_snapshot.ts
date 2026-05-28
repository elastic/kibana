/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import {
  ALERT_INSTANCE_ID,
  ALERT_RULE_UUID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
} from '@kbn/rule-data-utils';

export interface GetAlertSnoozeSnapshotParams {
  indices: string[];
  alertId: string;
  ruleId: string;
  fields: string[];
}

interface GetAlertSnoozeSnapshotParamsWithDeps extends GetAlertSnoozeSnapshotParams {
  logger: Logger;
  esClient: ElasticsearchClient;
}

export async function getAlertSnoozeSnapshot({
  indices,
  alertId,
  ruleId,
  fields,
  logger,
  esClient,
}: GetAlertSnoozeSnapshotParamsWithDeps): Promise<Record<string, unknown> | null> {
  try {
    const response = await esClient.search({
      index: indices,
      allow_no_indices: true,
      size: 1,
      fields,
      _source: false,
      query: {
        bool: {
          must: [
            { term: { [ALERT_RULE_UUID]: ruleId } },
            { term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } },
          ],
          filter: [{ term: { [ALERT_INSTANCE_ID]: alertId } }],
        },
      },
    });

    const hit = response.hits.hits[0];
    if (!hit) {
      return null;
    }

    const hitFields = hit.fields ?? {};
    return fields.reduce<Record<string, unknown>>((snapshot, field) => {
      const values = hitFields[field] as unknown[] | undefined;
      if (values && values.length > 0) {
        // Return single value for scalar fields; keep array for multi-value fields.
        snapshot[field] = values.length === 1 ? values[0] : values;
      } else {
        snapshot[field] = null;
      }
      return snapshot;
    }, {});
  } catch (error) {
    logger.error(
      `Error fetching snooze snapshot for alertId: ${alertId} and ruleId: ${ruleId} - ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return null;
  }
}
