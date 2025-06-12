/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import type { APIReturnType } from '@kbn/observability-ai-assistant-plugin/public';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';

export function useInferenceEndpoints() {
  const service = useAIAssistantAppService();

  const [inferenceEndpoints, setInferenceEndpoints] = useState<
    APIReturnType<'GET /internal/observability_ai_assistant/kb/inference_endpoints'>['endpoints']
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const controller = useMemo(() => new AbortController(), []);

  const fetchInferenceEndpoints = useCallback(async () => {
    setIsLoading(true);

    try {
      const res = await service.callApi(
        'GET /internal/observability_ai_assistant/kb/inference_endpoints',
        {
          signal: controller.signal,
        }
      );

      setInferenceEndpoints(res.endpoints);
      setError(undefined);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err as Error);
        setInferenceEndpoints([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [controller, service]);

  useEffect(() => {
    fetchInferenceEndpoints();

    return () => {
      controller.abort();
    };
  }, [controller, fetchInferenceEndpoints]);

  return { inferenceEndpoints, isLoading, error };
}
