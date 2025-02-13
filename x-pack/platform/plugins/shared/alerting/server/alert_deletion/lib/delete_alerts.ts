/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { SearchRequest } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { RulesSettingsAlertDeletionProperties } from '@kbn/alerting-types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';

interface DeleteAlertsOpts {
  alertDeletionSettings: RulesSettingsAlertDeletionProperties;
  dryRun?: boolean;
  esClient: ElasticsearchClient;
  spaceId: string;
}
export async function deleteAlerts({
  alertDeletionSettings,
  dryRun = false,
  esClient,
  spaceId,
}: DeleteAlertsOpts) {
  const {
    isActiveAlertsDeletionEnabled,
    isInactiveAlertsDeletionEnabled,
    activeAlertsDeletionThreshold,
    inactiveAlertsDeletionThreshold,
  } = alertDeletionSettings;

  // Get the alerts indices to query

  // get active alerts query and run
  const activeAlertsQuery = getActiveAlertsQuery(
    isActiveAlertsDeletionEnabled,
    activeAlertsDeletionThreshold
  );
  if (activeAlertsQuery) {
    const response = await esClient.count({ body: activeAlertsQuery });
    const r = await esClient.deleteByQuery({ body: activeAlertsQuery });
  }

  // get inactive alerts query and run
  const inactiveAlertsQuery = getInactiveAlertsQuery(
    isInactiveAlertsDeletionEnabled,
    inactiveAlertsDeletionThreshold
  );
  if (inactiveAlertsQuery) {
  }
}

function getActiveAlertsQuery(enabled: boolean, threshold: number): SearchRequest['body'] {
  if (!enabled) {
    return;
  }

  const filter = `(event.kind: "open" OR event.kind: "active") AND kibana.alert.start < "now-${threshold}d" AND NOT kibana.alert.end:*.`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
}

function getInactiveAlertsQuery(enabled: boolean, threshold: number): SearchRequest['body'] {
  if (!enabled) {
    return;
  }

  const filter = `(event.kind: "close" AND @timestamp < "now-${threshold}d) OR (kibana.alert.workflow_status: "closed" AND kibana.alert.workflow_status_updated_at < "now-${threshold}d") OR (kibana.alert.status: "untracked" AND kibana.alert.end < "now-${threshold}d")`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
}
