/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import { SPACE_IDS } from '@kbn/rule-data-utils';

export const getActiveAlertsQuery = (
  threshold: number,
  spaceId: string
): QueryDslQueryContainer => {
  const filter = `kibana.alert.status: "active" AND kibana.alert.start < "now-${threshold}d" AND NOT kibana.alert.end:* AND NOT kibana.alert.workflow_status_updated_at:* AND ${[
    SPACE_IDS,
  ]}: ${spaceId}`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
};

export const getInactiveAlertsQuery = (
  threshold: number,
  spaceId: string
): QueryDslQueryContainer => {
  const filter = `((kibana.alert.workflow_status: "closed" OR kibana.alert.workflow_status: "acknowledged") AND kibana.alert.workflow_status_updated_at < "now-${threshold}d") OR ((kibana.alert.status: "untracked" OR kibana.alert.status: "recovered") AND kibana.alert.end < "now-${threshold}d") AND ${[
    SPACE_IDS,
  ]}: ${spaceId}`;
  const filterKueryNode = fromKueryExpression(filter);
  return toElasticsearchQuery(filterKueryNode);
};
