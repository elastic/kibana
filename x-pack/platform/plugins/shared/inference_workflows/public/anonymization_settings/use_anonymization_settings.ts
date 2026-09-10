/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery, useMutation, useQueryClient } from '@kbn/react-query';
import type { HttpSetup } from '@kbn/core/public';
import type { AnonymizationSettings, BuiltInRule, CustomRule, FailureMode } from './types';

const SETTINGS_PATH = '/internal/inference_workflows/anonymization/settings';
const PREVIEW_PATH = '/internal/inference_workflows/anonymization/_preview';
const QUERY_KEY = ['inferenceWorkflows', 'anonymizationSettings'];

export const useAnonymizationSettings = (http: HttpSetup) => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => http.get<AnonymizationSettings>(SETTINGS_PATH),
  });

  const { mutateAsync: saveSettings, isLoading: isSaving } = useMutation({
    mutationFn: (patch: {
      enabled?: boolean;
      builtInRules?: BuiltInRule[];
      customRules?: CustomRule[];
      failureMode?: FailureMode | undefined;
    }) => http.put<{ updated: boolean }>(SETTINGS_PATH, { body: JSON.stringify(patch) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  return { settings, isLoading, error, saveSettings, isSaving };
};

export const usePreview = (http: HttpSetup) =>
  useMutation({
    mutationFn: (body: {
      text: string;
      builtInRules: BuiltInRule[];
      customRules: CustomRule[];
    }) =>
      http.post<{ tokenized: string; tokenMap: Record<string, string> }>(PREVIEW_PATH, {
        body: JSON.stringify(body),
      }),
  });
