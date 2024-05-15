/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';

import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { useKibana } from '../utils/kibana_react';
import { sloKeys } from './query_key_factory';
import { ActiveAlerts } from './active_alerts';

import { SLO_LONG_REFETCH_INTERVAL } from '../constants';

type SloIdAndInstanceId = [string, string];

interface Params {
  sloIdsAndInstanceIds: SloIdAndInstanceId[];
  shouldRefetch?: boolean;
}

export interface UseFetchActiveAlerts {
  data: ActiveAlerts;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

interface FindApiResponse {
  aggregations: {
    perSloId: {
      buckets: Array<{
        key: SloIdAndInstanceId;
        key_as_string: string;
        doc_count: number;
      }>;
    };
  };
}

const EMPTY_ACTIVE_ALERTS_MAP = new ActiveAlerts();

export function useFetchActiveAlerts({
  sloIdsAndInstanceIds = [],
  shouldRefetch = false,
}: Params): UseFetchActiveAlerts {
  const { http } = useKibana().services;

  const { isInitialLoading, isLoading, isError, isSuccess, isRefetching, data } = useQuery({
    queryKey: sloKeys.activeAlert(sloIdsAndInstanceIds),
    queryFn: async ({ signal }) => {
      try {
        const response = await http.post<FindApiResponse>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
          body: JSON.stringify({
            feature_ids: [AlertConsumers.SLO, AlertConsumers.OBSERVABILITY],
            size: 0,
            query: {
              bool: {
                filter: [
                  {
                    range: {
                      '@timestamp': {
                        gte: 'now-5m/m',
                      },
                    },
                  },
                  {
                    term: {
                      'kibana.alert.rule.rule_type_id': 'slo.rules.burnRate',
                    },
                  },
                  {
                    term: {
                      'kibana.alert.status': 'active',
                    },
                  },
                ],
                should: sloIdsAndInstanceIds.map(([sloId, instanceId]) => ({
                  bool: {
                    filter: [
                      { term: { 'slo.id': sloId } },
                      ...(instanceId === '*' ? [] : [{ term: { 'slo.instanceId': instanceId } }]),
                    ],
                  },
                })),
                minimum_should_match: 1,
              },
            },
            aggs: {
              perSloId: {
                multi_terms: {
                  size: 10000,
                  terms: [{ field: 'slo.id' }, { field: 'slo.instanceId' }],
                },
              },
            },
          }),
          signal,
        });

        const activeAlertsData = response.aggregations.perSloId.buckets.reduce((acc, bucket) => {
          return { ...acc, [bucket.key_as_string]: bucket.doc_count ?? 0 };
        }, {} as Record<string, number>);
        return new ActiveAlerts(activeAlertsData);
      } catch (error) {
        // ignore error
      }
    },
    refetchOnWindowFocus: false,
    refetchInterval: shouldRefetch ? SLO_LONG_REFETCH_INTERVAL : undefined,
    enabled: Boolean(sloIdsAndInstanceIds.length),
  });

  return {
    data: isInitialLoading ? EMPTY_ACTIVE_ALERTS_MAP : data ?? EMPTY_ACTIVE_ALERTS_MAP,
    isLoading: isInitialLoading || isLoading || isRefetching,
    isSuccess,
    isError,
  };
}
