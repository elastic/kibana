/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import {
  EXTRACTION_CONFIG_QUERY_KEY,
  INFERENCE_ENDPOINTS_QUERY_KEY,
  WORKFLOWS_QUERY_KEY,
} from '../query_keys';

export type ExtractionMethod = 'tika' | 'inference' | 'workflow' | 'connector';

export interface FormatOverride {
  method: ExtractionMethod;
  inferenceId?: string;
  workflowId?: string;
  connectorId?: string;
}

export interface ExtractionConfig {
  method: ExtractionMethod;
  inferenceId?: string;
  workflowId?: string;
  connectorId?: string;
  formatOverrides?: Record<string, FormatOverride>;
}

interface InferenceEndpoint {
  inference_id: string;
  service: string;
  task_type: string;
}

const DEFAULT_CONFIG: ExtractionConfig = { method: 'tika' };

export const useExtractionConfig = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: [EXTRACTION_CONFIG_QUERY_KEY],
    queryFn: () => http.get<ExtractionConfig>('/internal/data_sources/extraction_config'),
  });

  const updateMutation = useMutation({
    mutationFn: (newConfig: ExtractionConfig) =>
      http.put<ExtractionConfig>('/internal/data_sources/extraction_config', {
        body: JSON.stringify(newConfig),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EXTRACTION_CONFIG_QUERY_KEY] });
    },
  });

  const config = useMemo(
    () => configQuery.data ?? DEFAULT_CONFIG,
    [configQuery.data]
  );

  return {
    config,
    isLoading: configQuery.isLoading,
    isError: configQuery.isError,
    updateConfig: updateMutation.mutate,
    isUpdating: updateMutation.isLoading,
  };
};

export const useInferenceEndpoints = () => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: [INFERENCE_ENDPOINTS_QUERY_KEY],
    queryFn: async () => {
      const response = await http.get<{ endpoints: InferenceEndpoint[] }>(
        '/internal/data_sources/inference_endpoints'
      );
      return response.endpoints;
    },
  });
};

export interface WorkflowOption {
  id: string;
  name: string;
  description: string;
  compatible: boolean;
  issues?: string[];
}

export const useWorkflows = () => {
  const { http } = useKibana().services;

  return useQuery({
    queryKey: [WORKFLOWS_QUERY_KEY],
    queryFn: async () => {
      const response = await http.get<{ workflows: WorkflowOption[] }>(
        '/internal/data_sources/workflows'
      );
      return response.workflows;
    },
  });
};
