/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { DEFAULT_KI_LIST_LIFECYCLE_STATUSES } from '../../../common/ki_list_lifecycle';
import type { KiLifecycleStatus } from '../../../common/step_types/ki';
import type { GetKiResponse } from '../../../common/http_api/knowledge_indicators';
import { getKi } from '../api/knowledge_indicators';
import { contextEngineQueryKeys } from './query_keys';
import { useKibana } from './use_kibana';

interface UseKiArgs {
  aiIndexId: string;
  kiId: string;
  index: string;
  lifecycleStatuses?: KiLifecycleStatus[];
  enabled?: boolean;
}

interface UseKiResult {
  ki: GetKiResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

export const useKi = ({
  aiIndexId,
  kiId,
  index,
  lifecycleStatuses = DEFAULT_KI_LIST_LIFECYCLE_STATUSES,
  enabled = true,
}: UseKiArgs): UseKiResult => {
  const {
    services: { http },
  } = useKibana();
  const lifecycleStatusesKey = lifecycleStatuses.join(',');

  const { data, isLoading, error } = useQuery<GetKiResponse, Error>({
    queryKey: contextEngineQueryKeys.aiIndex.ki(aiIndexId, index, kiId, lifecycleStatusesKey),
    queryFn: ({ signal }) => getKi(http, { aiIndexId, kiId, index, lifecycleStatuses, signal }),
    enabled: enabled && index.length > 0,
  });

  return {
    ki: data,
    isLoading,
    error: error ?? undefined,
  };
};
