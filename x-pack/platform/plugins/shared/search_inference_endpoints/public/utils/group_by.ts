/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceAPIConfigResponse } from '@kbn/ml-trained-models-utils';
import { SERVICE_PROVIDERS, ServiceProviderKeys } from '@kbn/inference-endpoint-ui-common';

import {
  type GroupedInferenceEndpointsData,
  type GroupByViewOptions,
  GroupByOptions,
} from '../types';

export const GroupByServiceReducer = (
  acc: Record<string, GroupedInferenceEndpointsData>,
  endpoint: InferenceAPIConfigResponse
): Record<string, GroupedInferenceEndpointsData> => {
  const service = endpoint.service;

  if (service in acc) {
    acc[service].endpoints.push(endpoint);
  } else {
    const provider = SERVICE_PROVIDERS[service];
    acc[service] = {
      groupId: service,
      groupLabel: provider ? provider.name : service,
      endpoints: [endpoint],
    };
  }

  return acc;
};

export function GroupByReducer(groupBy: GroupByViewOptions) {
  switch (groupBy) {
    case GroupByOptions.Service:
      return GroupByServiceReducer;
    default:
      return assertNever(groupBy);
  }
}

export function defaultGroupedInferenceEndpointsDataCompare(
  a: GroupedInferenceEndpointsData,
  b: GroupedInferenceEndpointsData
) {
  if (a.groupLabel === b.groupLabel) {
    return 0;
  }
  if (a.groupLabel < b.groupLabel) {
    return -1;
  }
  if (a.groupLabel > b.groupLabel) {
    return 1;
  }
  return 0;
}

function isElasticService(service: string) {
  return service === ServiceProviderKeys.elastic || service === ServiceProviderKeys.elasticsearch;
}

export function ServiceGroupBySort(
  a: GroupedInferenceEndpointsData,
  b: GroupedInferenceEndpointsData
) {
  if (a.groupLabel === b.groupLabel) {
    return 0;
  }
  const aIsElastic = isElasticService(a.groupId);
  const bIsElastic = isElasticService(b.groupId);
  if (aIsElastic || bIsElastic) {
    if (aIsElastic && bIsElastic) {
      if (a.groupLabel < b.groupLabel) {
        return -1;
      }
      return 1;
    } else if (aIsElastic) {
      return -1;
    }
    return 1;
  }
  if (a.groupLabel < b.groupLabel) {
    return -1;
  }
  return 1;
}

export function GroupBySort(groupBy: GroupByViewOptions) {
  switch (groupBy) {
    case GroupByOptions.Service:
      return ServiceGroupBySort;
    default:
      return defaultGroupedInferenceEndpointsDataCompare;
  }
}

export function assertNever(x: never): never {
  throw new Error(`Unhandled groupBy option: ${x}`);
}
