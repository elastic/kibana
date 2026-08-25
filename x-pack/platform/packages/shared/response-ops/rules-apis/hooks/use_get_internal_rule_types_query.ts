/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import { useQuery } from '@kbn/react-query';
import { getInternalRuleTypes } from '../apis/get_internal_rule_types';
import { queryKeys } from '../query_keys';

export const getKey = queryKeys.getInternalRuleTypes;

export interface UseGetInternalRuleTypesQueryParams {
  http: HttpStart;
  /**
   * When `true`, the query also includes rule types the user can read as alerts
   * (not only as rules). Alert views opt in so alerts-only users still receive a
   * non-empty list.
   */
  includeAlertViewableTypes?: boolean;
}

export const useGetInternalRuleTypesQuery = ({
  http,
  includeAlertViewableTypes = false,
}: UseGetInternalRuleTypesQueryParams) => {
  return useQuery({
    queryKey: getKey({ includeAlertViewableTypes }),
    queryFn: () => getInternalRuleTypes({ http, includeAlertViewableTypes }),
    staleTime: Infinity,
  });
};
