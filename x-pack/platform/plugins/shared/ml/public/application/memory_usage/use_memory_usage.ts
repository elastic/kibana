/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import { extractErrorProperties } from '@kbn/ml-error-utils';
import { useRefresh } from '../routing/use_refresh';
import { useTrainedModelsApiService } from '../services/ml_api_service/trained_models';
import type { MlSavedObjectType } from '../../../common/types/saved_objects';
import type { MemoryUsageInfo } from '../../../common/types/trained_models';

export const useMemoryUsage = (node?: string, type?: MlSavedObjectType) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<MemoryUsageInfo[]>([]);
  const [error, setError] = useState<string | undefined>();
  const refresh = useRefresh();
  const trainedModelsApiService = useTrainedModelsApiService();
  const isMounted = useMountedState();

  useEffect(
    function getMemoryData() {
      const fetchData = async () => {
        setLoading(true);
        try {
          const resp = await trainedModelsApiService.memoryUsage(type, node);
          setError(undefined);
          setData(resp);
        } catch (e) {
          const err = extractErrorProperties(e);
          setError(err.message);
        }
        setLoading(false);
      };

      if (!isMounted()) return;

      fetchData();
    },
    [node, type, trainedModelsApiService, isMounted, refresh]
  );

  return { loading, data, error };
};
