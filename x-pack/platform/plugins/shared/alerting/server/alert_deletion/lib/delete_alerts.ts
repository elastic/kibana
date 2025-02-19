/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID, SPACE_IDS } from '@kbn/rule-data-utils';
import { compact, omitBy } from 'lodash';
import { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';

interface DeleteAlertsOpts {
  alertDeletionSettings: RulesSettingsAlertDeletionProperties;
  dryRun?: boolean;
  esClient: ElasticsearchClient;
  indices: string[];
  logger: Logger;
  spaceId: string;
  taskManagerStart: TaskManagerStartContract;
}

interface ActiveAlertFilteredSource {
  [ALERT_INSTANCE_ID]: string;
  [ALERT_RULE_UUID]: string;
  [SPACE_IDS]: string;
}

export async function deleteAlerts({
  alertDeletionSettings,
  dryRun = false,
  indices,
  esClient,
  logger,
  spaceId,
  taskManagerStart
}: DeleteAlertsOpts): Promise<number> {
  const {
    isActiveAlertsDeletionEnabled,
    isInactiveAlertsDeletionEnabled,
    activeAlertsDeletionThreshold,
    inactiveAlertsDeletionThreshold,
  } = alertDeletionSettings;

  let numAlertsDeleted = 0;

  // TODO - are we filtering by solution type?

  if (isActiveAlertsDeletionEnabled) {
    const activeAlertsQuery = getActiveAlertsQuery(activeAlertsDeletionThreshold, spaceId);

    try {
      if (dryRun) {
        const countResponse = await esClient.count({ index: indices, query: activeAlertsQuery });
        numAlertsDeleted += countResponse.count;
      } else {
        const searchResponse = await esClient.search<ActiveAlertFilteredSource>({
          index: indices,
          query: activeAlertsQuery,
          _source: [ALERT_RULE_UUID, SPACE_IDS, ALERT_INSTANCE_ID],
        });

        // bulk delete the alert documents by id
        const bulkDeleteRequest = [];
        for (const alert of searchResponse.hits.hits) {
          bulkDeleteRequest.push({ delete: { _index: alert._index, _id: alert._id } });
        }
        const bulkDeleteResponse = await esClient.bulk({operations: bulkDeleteRequest});

        // get the task documents
        const taskIds: string[] = compact(searchResponse.hits.hits
          .map((hit) => {
            const ruleId = hit._source?.[ALERT_RULE_UUID];
            if (ruleId) {
              return `task:${ruleId}`;
            }
        }));
        const alertUuidsToClear = searchResponse.hits.hits.map((hit) => hit._id);

        await taskManagerStart.bulkUpdateState(taskIds, (state, id) => {
          try {
            const updatedAlertInstances = omitBy(state.alertInstances, ({ meta: { uuid } }) =>
              alertUuidsToClear.includes(uuid)
            );
            return {
              ...state,
              alertInstances: updatedAlertInstances,
            };
          } catch (err) {
            return state;
          }
        });

        bulkDeleteResponse.items.forEach((item) => {
          if (item.delete?.result === 'deleted') {
            numAlertsDeleted++;
          }
        });
      }
    } catch (err) {
      logger.error(`Error deleting active alerts: ${err}`);
    }
  }

  if (isInactiveAlertsDeletionEnabled) {
    const inactiveAlertsQuery = getInactiveAlertsQuery(inactiveAlertsDeletionThreshold, spaceId);

    try {
      if (dryRun) {
        const countResponse = await esClient.count({ index: indices, query: inactiveAlertsQuery });
        numAlertsDeleted += countResponse.count;
      } else {
        const dbqResponse = await esClient.deleteByQuery({ index: indices, query: inactiveAlertsQuery });
        numAlertsDeleted += dbqResponse.deleted ?? 0;
      }
    } catch (err) {

    }
  }

  return numAlertsDeleted;
}

function getActiveAlertsQuery(threshold: number, spaceId: string): QueryDslQueryContainer {
  const filter = `(event.kind: "open" OR event.kind: "active") AND kibana.alert.start < "now-${threshold}d" AND NOT kibana.alert.end:* AND ${[SPACE_IDS]}: ${spaceId}`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
}

function getInactiveAlertsQuery(threshold: number, spaceId: string): QueryDslQueryContainer {
  const filter = `((event.kind: "close" AND @timestamp < "now-${threshold}d") OR (kibana.alert.workflow_status: "closed" AND kibana.alert.workflow_status_updated_at < "now-${threshold}d") OR (kibana.alert.status: "untracked" AND kibana.alert.end < "now-${threshold}d")) AND ${[SPACE_IDS]}: ${spaceId}`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
}
