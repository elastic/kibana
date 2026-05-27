/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type {
  CloudOnboardingDeployment,
  CloudOnboardingDeploymentStatus,
} from '@kbn/fleet-plugin/common/types/models/cloud_onboarding_deployment';

const BASE_URL = '/api/fleet/cloud_onboarding_deployments';
const POLL_INTERVAL_MS = 10_000;

const TERMINAL_STATUSES: CloudOnboardingDeploymentStatus[] = ['succeeded', 'failed'];

interface SingleItemResponse {
  item: CloudOnboardingDeployment;
}

export const useDeploymentPolling = (deploymentId: string | null, enabled: boolean) => {
  const { http } = useKibana().services;
  const [deployment, setDeployment] = useState<CloudOnboardingDeployment | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const fetchDeployment = useCallback(
    async (id: string) => {
      const result = await http.get<SingleItemResponse>(`${BASE_URL}/${encodeURIComponent(id)}`);
      return result.item;
    },
    [http]
  );

  useEffect(() => {
    if (!enabled || !deploymentId) {
      stopPolling();
      return;
    }

    let isActive = true;

    const poll = async () => {
      try {
        const item = await fetchDeployment(deploymentId);
        if (!isActive) {
          return;
        }

        setDeployment(item);

        if (TERMINAL_STATUSES.includes(item.status)) {
          stopPolling();
        }
      } catch (_) {
        // Polling failures are silently retried on next interval
      }
    };

    setIsPolling(true);
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      isActive = false;
      stopPolling();
    };
  }, [deploymentId, enabled, fetchDeployment, stopPolling]);

  return { deployment, isPolling };
};
