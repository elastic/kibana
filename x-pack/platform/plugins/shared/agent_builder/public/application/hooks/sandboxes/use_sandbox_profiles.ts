/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type {
  SandboxProfile,
  SandboxProfileCreateRequest,
  SandboxProfileUpdateRequest,
} from '@kbn/agent-builder-common';
import { internalApiPath } from '../../../../common/constants';
import { useKibana } from '../use_kibana';

const PROFILES_KEY = ['agentBuilder', 'sandboxProfiles'] as const;

export interface SandboxTestStep {
  name: string;
  ok: boolean;
  detail?: string;
  durationMs: number;
}

export interface SandboxTestResult {
  ok: boolean;
  metadata?: SandboxProviderMetadata;
  steps: SandboxTestStep[];
}

export interface SandboxProviderMetadata {
  provider: string;
  environment: string;
  namespace?: string;
  image: string;
  isLocal: boolean;
  clientVersion?: string;
  serverVersion?: string;
  serverUrl?: string;
  nodes?: string[];
  error?: string;
}

/** List + mutate sandbox profiles via the internal API. */
export const useSandboxProfiles = () => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: PROFILES_KEY,
    queryFn: () =>
      http.get<{ profiles: SandboxProfile[]; canEncrypt: boolean }>(
        `${internalApiPath}/sandbox_profiles`
      ),
  });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: PROFILES_KEY }),
    [queryClient]
  );

  const createMutation = useMutation({
    mutationFn: (body: SandboxProfileCreateRequest) =>
      http.post<{ profile: SandboxProfile }>(`${internalApiPath}/sandbox_profiles`, {
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: SandboxProfileUpdateRequest }) =>
      http.put<{ profile: SandboxProfile }>(
        `${internalApiPath}/sandbox_profiles/${encodeURIComponent(id)}`,
        { body: JSON.stringify(body) }
      ),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      http.delete(`${internalApiPath}/sandbox_profiles/${encodeURIComponent(id)}`),
    onSuccess: invalidate,
  });

  const test = useCallback(
    (id: string) =>
      http.post<SandboxTestResult>(
        `${internalApiPath}/sandbox_profiles/${encodeURIComponent(id)}/test`
      ),
    [http]
  );

  return {
    profiles: data?.profiles ?? [],
    canEncrypt: data?.canEncrypt ?? true,
    isLoading,
    error,
    refetch,
    createProfile: createMutation.mutateAsync,
    isCreating: createMutation.isLoading,
    updateProfile: updateMutation.mutateAsync,
    isUpdating: updateMutation.isLoading,
    deleteProfile: deleteMutation.mutateAsync,
    testProfile: test,
  };
};
