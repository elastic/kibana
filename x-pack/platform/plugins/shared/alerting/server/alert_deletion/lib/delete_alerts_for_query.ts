/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryDslQueryContainer,
  SearchResponse,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS, TIMESTAMP } from '@kbn/rule-data-utils';
import type { AlertDeletionContext } from '../alert_deletion_client';
import { AlertAuditAction, alertAuditSystemEvent } from '../../lib';

interface AlertFilteredSource {
  [ALERT_INSTANCE_ID]: string;
  [ALERT_RULE_UUID]: string;
  [SPACE_IDS]: string;
}

const PAGE_SIZE = 1000;
const MAX_ALERTS_TO_DELETE = 10000;

export const deleteAlertsForQuery = async (
  context: AlertDeletionContext,
  indices: string[],
  query: QueryDslQueryContainer,
  abortController: AbortController
) => {
  const esClient = await context.elasticsearchClientPromise;

  let numAlertsDeleted = 0;
  let pitId: string | undefined | null = null;
  let searchAfter: SortResults | null | undefined = null;
  const errors: string[] = [];
  const taskIds = new Set<string>();
  const alertUuidsToClear: string[] = [];

  do {
    if (!pitId) {
      const pitResponse = await esClient.openPointInTime({
        index: indices,
        keep_alive: '1m',
        ignore_unavailable: true,
      });
      pitId = pitResponse.id;
    }

    try {
      // query for alerts to delete, sorted to return oldest first
      const searchResponse: SearchResponse<AlertFilteredSource> = await esClient.search(
        {
          query,
          size: PAGE_SIZE,
          sort: [{ [TIMESTAMP]: 'asc' }],
          pit: { id: pitId, keep_alive: '1m' },
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID, TIMESTAMP],
          ...(searchAfter ? { search_after: searchAfter } : {}),
        },
        { signal: abortController.signal }
      );
      pitId = searchResponse.pit_id ?? pitId;

      if (searchResponse.hits.hits.length === 0) {
        searchAfter = null;
      } else {
        const numResults = searchResponse.hits.hits.length;
        searchAfter = searchResponse.hits.hits[numResults - 1].sort;

        // bulk delete the alert documents by id
        const bulkDeleteRequest = [];
        for (const alert of searchResponse.hits.hits) {
          bulkDeleteRequest.push({ delete: { _index: alert._index, _id: alert._id } });
        }
        const bulkDeleteResponse = await esClient.bulk(
          { operations: bulkDeleteRequest },
          { signal: abortController.signal }
        );

        // iterate and audit log each alert by ID
        bulkDeleteResponse.items.forEach((item, index) => {
          const alertUuid = searchResponse.hits.hits[index]._id;
          if (item.delete?.result === 'deleted') {
            numAlertsDeleted++;

            const ruleId = searchResponse.hits.hits[index]._source?.[ALERT_RULE_UUID];
            if (ruleId) {
              taskIds.add(ruleId);
            }

            alertUuidsToClear.push(alertUuid!);

            context.auditService?.withoutRequest.log(
              alertAuditSystemEvent({
                action: AlertAuditAction.DELETE,
                id: alertUuid,
                outcome: 'success',
              })
            );
          } else {
            context.auditService?.withoutRequest.log(
              alertAuditSystemEvent({
                action: AlertAuditAction.DELETE,
                id: alertUuid,
                outcome: 'failure',
                error: new Error(item.delete?.error?.reason ?? undefined), // reason can be null and it's not a valid parameter for Error
              })
            );
            errors.push(`Error deleting alert "${alertUuid!}" - ${item.delete?.error?.reason}`);
          }
        });
      }
    } catch (err) {
      if (pitId) {
        await esClient.closePointInTime({ id: pitId });
        pitId = null;
      }
      throw err;
    }
  } while (searchAfter != null && numAlertsDeleted < MAX_ALERTS_TO_DELETE);

  try {
    if (pitId) {
      await esClient.closePointInTime({ id: pitId });
    }
  } catch (closeErr) {
    context.logger.error(
      `Failed to close point in time during alert deletion task: ${closeErr.message}`
    );
  }

  return { numAlertsDeleted, taskIds, alertUuidsToClear, errors };
};
