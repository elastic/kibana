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
  const filterClauses = [
    `kibana.alert.status: "active"`,
    `kibana.alert.start < "now-${threshold}d"`,
    `NOT kibana.alert.end:*`,
    `NOT kibana.alert.workflow_status_updated_at:*`,
    `NOT kibana.alert.case_ids:*`,
    `${[SPACE_IDS]}: ${spaceId}`,
  ];
  const filterKueryNode = fromKueryExpression(filterClauses.join(' AND '));
  return toElasticsearchQuery(filterKueryNode);
};

export const getInactiveAlertsQuery = (
  threshold: number,
  spaceId: string
): QueryDslQueryContainer => {
  const closedFilter = `(kibana.alert.workflow_status: "closed" OR kibana.alert.workflow_status: "acknowledged")`;
  const closedThreshold = `kibana.alert.workflow_status_updated_at < "now-${threshold}d"`;
  const inactiveFilter = `(kibana.alert.status: "untracked" OR kibana.alert.status: "recovered")`;
  const inactiveThreshold = `kibana.alert.end < "now-${threshold}d"`;

  const filterClauses = [
    `((${closedFilter} AND ${closedThreshold}) OR (${inactiveFilter} AND ${inactiveThreshold}))`,
    `NOT kibana.alert.case_ids:*`,
    `${[SPACE_IDS]}: ${spaceId}`,
  ];

  const filterKueryNode = fromKueryExpression(filterClauses.join(' AND '));
  return toElasticsearchQuery(filterKueryNode);
};
