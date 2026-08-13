/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/types';
import type { KueryNode } from '@kbn/es-query';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { ConnectorTypes } from '../../../common';
import { CASE_USER_ACTION_SAVED_OBJECT } from '../../../common/constants';
import { buildFilter } from '../../client/utils';
import type {
  CasesTelemetryConnectorKeys,
  CasesTelemetry,
  CollectTelemetryDataParams,
  MaxBucketOnCaseAggregation,
  ReferencesAggregation,
} from '../types';
import {
  getConnectorsCardinalityAggregationQuery,
  getMaxBucketOnCaseAggregationQuery,
  getOnlyConnectorsFilter,
} from './utils';

export const CONNECTOR_TELEMETRY_MAPPING = {
  [ConnectorTypes.serviceNowITSM]: 'itsm',
  [ConnectorTypes.serviceNowSIR]: 'sir',
  [ConnectorTypes.jira]: 'jira',
  [ConnectorTypes.resilient]: 'resilient',
  [ConnectorTypes.swimlane]: 'swimlane',
  [ConnectorTypes.theHive]: 'thehive',
  [ConnectorTypes.casesWebhook]: 'caseswebhook',
} as const satisfies Record<
  Exclude<ConnectorTypes, ConnectorTypes.none>,
  CasesTelemetryConnectorKeys
>;

export const getConnectorsTelemetryData = async ({
  savedObjectsClient,
}: CollectTelemetryDataParams): Promise<CasesTelemetry['connectors']> => {
  const getData = async <A>({
    filter,
    aggs,
  }: {
    filter?: KueryNode;
    aggs?: Record<string, AggregationsAggregationContainer>;
  } = {}) => {
    const res = await savedObjectsClient.find<unknown, A>({
      page: 0,
      perPage: 0,
      filter,
      type: CASE_USER_ACTION_SAVED_OBJECT,
      namespaces: ['*'],
      aggs: {
        ...aggs,
      },
    });

    return res;
  };

  const getConnectorData = async (connectorType: string) => {
    const connectorFilter = buildFilter({
      filters: [connectorType],
      field: 'payload.connector.type',
      operator: 'or',
      type: CASE_USER_ACTION_SAVED_OBJECT,
    });

    const res = await getData<ReferencesAggregation>({
      filter: connectorFilter,
      aggs: getConnectorsCardinalityAggregationQuery(),
    });

    return res;
  };

  const connectorTypes = Object.keys(CONNECTOR_TELEMETRY_MAPPING);

  const all = await Promise.all([
    getData<ReferencesAggregation>({ aggs: getConnectorsCardinalityAggregationQuery() }),
    getData<MaxBucketOnCaseAggregation>({
      filter: getOnlyConnectorsFilter(),
      aggs: getMaxBucketOnCaseAggregationQuery(CASE_USER_ACTION_SAVED_OBJECT),
    }),
    ...connectorTypes.map((connectorType) => getConnectorData(connectorType)),
  ]);

  const connectorData = all.slice(2) as Array<
    SavedObjectsFindResponse<unknown, ReferencesAggregation>
  >;

  const data = connectorData.reduce((acc, res, currentIndex) => {
    acc[connectorTypes[currentIndex]] =
      res.aggregations?.references?.referenceType?.referenceAgg?.value ?? 0;
    return acc;
  }, {} as Record<(typeof connectorTypes)[number], number>);

  const statsPerConnector = Object.entries(CONNECTOR_TELEMETRY_MAPPING).reduce(
    (acc, [connectorType, connectorName]) => {
      acc[connectorName] = { totalAttached: data[connectorType] };
      return acc;
    },
    {} as Record<CasesTelemetryConnectorKeys, { totalAttached: number }>
  );

  const generalStats = {
    all: {
      totalAttached: all[0].aggregations?.references?.referenceType?.referenceAgg?.value ?? 0,
    },
    maxAttachedToACase: all[1].aggregations?.references?.cases?.max?.value ?? 0,
  };

  return {
    all: {
      ...generalStats,
      ...statsPerConnector,
    },
  };
};
