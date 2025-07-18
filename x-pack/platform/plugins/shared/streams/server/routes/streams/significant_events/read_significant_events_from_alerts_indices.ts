/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import type { ChangePointType } from '@kbn/es-types/src';
import { SignificantEventsGetResponse, SignificantEventsResponse } from '@kbn/streams-schema';
import { isEmpty, keyBy } from 'lodash';
import { AssetClient } from '../../../lib/streams/assets/asset_client';
import { getRuleIdFromQueryLink } from '../../../lib/streams/assets/query/helpers/query';

export async function readSignificantEventsFromAlertsIndices(
  params: { name: string; from: Date; to: Date },
  dependencies: {
    assetClient: AssetClient;
    scopedClusterClient: IScopedClusterClient;
  }
): Promise<SignificantEventsGetResponse> {
  const { assetClient, scopedClusterClient } = dependencies;
  const { name, from, to } = params;

  const queryLinks = await assetClient.getAssetLinks(name, ['query']);
  if (isEmpty(queryLinks)) {
    return [];
  }

  const queryLinkByRuleId = keyBy(queryLinks, (queryLink) => getRuleIdFromQueryLink(queryLink));
  const ruleIds = Object.keys(queryLinkByRuleId);

  const esqlQuery = createEsqlRequest({
    ruleIds,
    from,
    to,
  });

  const { columns = [], values = [] } = await scopedClusterClient.asCurrentUser.esql
    .query({
      query: esqlQuery,
    })
    .catch(() => {
      return { columns: [], values: [] };
    });

  if (!columns || !values) {
    return queryLinks.map((queryLink) => ({
      id: queryLink.query.id,
      title: queryLink.query.title,
      kql: queryLink.query.kql,
      occurrences: [],
      change_points: {
        type: {},
      },
    }));
  }

  const dateColIndex = columns.findIndex((col) => col.name === 'interval');
  const countColIndex = columns.findIndex((col) => col.name === 'count');
  const ruleIdColIndex = columns.findIndex((col) => col.name === 'rule_id');
  const pValueColIndex = columns.findIndex((col) => col.name === 'pvalue');
  const typeColIndex = columns.findIndex((col) => col.name === 'type');

  if (
    dateColIndex === -1 ||
    countColIndex === -1 ||
    ruleIdColIndex === -1 ||
    pValueColIndex === -1 ||
    typeColIndex === -1
  ) {
    return queryLinks.map((queryLink) => ({
      id: queryLink.query.id,
      title: queryLink.query.title,
      kql: queryLink.query.kql,
      occurrences: [],
      change_points: {
        type: {},
      },
    }));
  }

  const significantEvents = values.reduce((acc, row, index) => {
    const ruleId = row[ruleIdColIndex] as string;
    if (!ruleId) {
      return acc;
    }

    const queryLink = queryLinkByRuleId[ruleId];
    if (!queryLink) {
      return acc;
    }

    const currSigEvent = acc[queryLink.query.id] || {
      id: queryLink.query.id,
      title: queryLink.query.title,
      kql: queryLink.query.kql,
      occurrences: [],
      change_points: {
        type: {},
      },
    };

    const interval = row[dateColIndex] as string;
    const count = row[countColIndex] as number;

    currSigEvent.occurrences.push({
      date: interval,
      count,
    });

    const changePointType = row[typeColIndex] as ChangePointType;
    const pValue = row[pValueColIndex] as number;

    if (changePointType && !isNaN(pValue)) {
      currSigEvent.change_points.type = {
        [changePointType]: { p_value: pValue, change_point: index },
      };
    }

    acc[queryLink.query.id] = currSigEvent;
    return acc;
  }, {} as Record<string, SignificantEventsResponse>);

  const foundSignificantEventsIds = Object.keys(significantEvents);

  const notFoundSignificantEvents = queryLinks
    .filter((queryLink) => !foundSignificantEventsIds.includes(queryLink.query.id))
    .map((queryLink) => ({
      id: queryLink.query.id,
      title: queryLink.query.title,
      kql: queryLink.query.kql,
      occurrences: [],
      change_points: {
        type: {},
      },
    }));

  return Object.values(significantEvents).concat(notFoundSignificantEvents);
}

function createEsqlRequest({
  ruleIds,
  from,
  to,
}: {
  ruleIds: string[];
  from: Date;
  to: Date;
}): string {
  return `FROM .alerts-streams.alerts-default
  | WHERE @timestamp >= "${from.toISOString()}" AND @timestamp <= "${to.toISOString()}"
  | WHERE ${ruleIds.map((ruleId) => `kibana.alert.rule.uuid == "${ruleId}"`).join(' OR ')} 
  | STATS count = COUNT(*) BY rule_id = kibana.alert.rule.uuid, interval = BUCKET(@timestamp, 50, "${from.toISOString()}", "${to.toISOString()}")
  | CHANGE_POINT count ON interval`;
}
