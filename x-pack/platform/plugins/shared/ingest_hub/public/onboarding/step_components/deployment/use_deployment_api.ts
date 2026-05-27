/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  CloudOnboardingDeployment,
  CreateCloudOnboardingDeploymentInput,
  UpdateCloudOnboardingDeploymentInput,
} from '@kbn/fleet-plugin/common/types/models/cloud_onboarding_deployment';

const BASE_URL = '/api/fleet/cloud_onboarding_deployments';

const XSRF_HEADERS = { 'kbn-xsrf': 'true' };

interface PrepareCloudOnboardingDeploymentResponse {
  templateUrl: string;
  templateParameters: Record<string, string>;
  cliCommand: string;
  apiKeyId?: string;
}

interface SingleItemResponse {
  item: CloudOnboardingDeployment;
}

export const useCreateDeployment = () => {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createDeployment = useCallback(
    async (input: CreateCloudOnboardingDeploymentInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await http.post<SingleItemResponse>(BASE_URL, {
          body: JSON.stringify(input),
          headers: XSRF_HEADERS,
        });
        return result.item;
      } catch (err) {
        const nextError = err instanceof Error ? err : new Error(String(err));
        setError(nextError);
        throw nextError;
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  return { createDeployment, isLoading, error };
};

export const usePrepareDeployment = () => {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const prepareDeployment = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        return await http.post<PrepareCloudOnboardingDeploymentResponse>(
          `${BASE_URL}/${encodeURIComponent(id)}/prepare`,
          {
            headers: XSRF_HEADERS,
          }
        );
      } catch (err) {
        const nextError = err instanceof Error ? err : new Error(String(err));
        setError(nextError);
        throw nextError;
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  return { prepareDeployment, isLoading, error };
};

export const useCompleteDeployment = () => {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const completeDeployment = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await http.post<SingleItemResponse>(
          `${BASE_URL}/${encodeURIComponent(id)}/complete`,
          {
            headers: XSRF_HEADERS,
          }
        );
        return result.item;
      } catch (err) {
        const nextError = err instanceof Error ? err : new Error(String(err));
        setError(nextError);
        throw nextError;
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  return { completeDeployment, isLoading, error };
};

export const useUpdateDeployment = () => {
  const { http } = useKibana().services;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateDeployment = useCallback(
    async (id: string, update: UpdateCloudOnboardingDeploymentInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await http.put<SingleItemResponse>(`${BASE_URL}/${encodeURIComponent(id)}`, {
          body: JSON.stringify(update),
          headers: XSRF_HEADERS,
        });
        return result.item;
      } catch (err) {
        const nextError = err instanceof Error ? err : new Error(String(err));
        setError(nextError);
        throw nextError;
      } finally {
        setIsLoading(false);
      }
    },
    [http]
  );

  return { updateDeployment, isLoading, error };
};
