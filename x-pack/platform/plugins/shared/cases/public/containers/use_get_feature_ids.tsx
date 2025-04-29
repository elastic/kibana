/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { isValidFeatureId } from '@kbn/rule-data-utils';
import { useMemo } from 'react';
import type { ServerError } from '../types';
import { useCasesToast } from '../common/use_cases_toast';
import * as i18n from './translations';
import { getFeatureIds } from './api';
import { casesQueriesKeys } from './constants';
import type { FeatureIdsResponse } from './types';

interface UseGetFeatureIdsResponse {
  featureIds: string[];
  ruleTypeIds: string[];
}

const transformResponseToFeatureIds = (data: FeatureIdsResponse): UseGetFeatureIdsResponse => {
  const localFeatureIds = new Set<string>();
  data?.aggregations?.consumer?.buckets?.forEach(
    ({ key, doc_count: docCount }: { key: string; doc_count: number }) => {
      if (docCount > 0 && isValidFeatureId(key)) {
        localFeatureIds.add(key);
      }
    }
  );
  data?.aggregations?.producer?.buckets?.forEach(
    ({ key, doc_count: docCount }: { key: string; doc_count: number }) => {
      if (docCount > 0 && isValidFeatureId(key)) {
        localFeatureIds.add(key);
      }
    }
  );
  const ruleTypeIds =
    data?.aggregations?.ruleTypeIds?.buckets
      ?.filter(({ doc_count: docCount }: { doc_count: number }) => docCount > 0)
      .map(({ key }: { key: string }) => key) ?? [];

  return { featureIds: [...localFeatureIds], ruleTypeIds };
};

export const useGetFeatureIds = (alertIds: string[], enabled: boolean) => {
  const { showErrorToast } = useCasesToast();
  const { data, isInitialLoading, isLoading } = useQuery<
    FeatureIdsResponse,
    ServerError,
    UseGetFeatureIdsResponse
  >(
    casesQueriesKeys.alertFeatureIds(alertIds),
    ({ signal }) => {
      return getFeatureIds({
        query: {
          ids: {
            values: alertIds,
          },
        },
        signal,
      });
    },
    {
      select: transformResponseToFeatureIds,
      enabled,
      onError: (error: ServerError) => {
        showErrorToast(error, { title: i18n.ERROR_TITLE });
      },
    }
  );

  return useMemo(
    () => ({ data, isLoading: (isInitialLoading || isLoading) && enabled }),
    [data, enabled, isInitialLoading, isLoading]
  );
};

export type UseGetFeatureIds = typeof useGetFeatureIds;
