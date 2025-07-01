/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getKey as getInternalRuleTypesQueryKey } from '@kbn/response-ops-rules-apis/hooks/use_get_internal_rule_types_query';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { InternalRuleType } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { getInternalRuleTypes } from '@kbn/response-ops-rules-apis/apis/get_internal_rule_types';
import { queryClient } from '../query_client';

export const getInternalRuleTypesWithCache = async (http: CoreStart['http']) => {
  // We cannot use the `useGetInternalRuleTypesQuery` hook since this fetch happens outside
  // of React, but we can interact with the query cache to avoid duplicated requests.
  // This effectively acts as a prefetch for the subsequent rule type requests performed by the
  // embeddable panel renderers
  return queryClient.fetchQuery<InternalRuleType[]>({
    queryKey: getInternalRuleTypesQueryKey(),
    queryFn: () => getInternalRuleTypes({ http }),
  });
};
