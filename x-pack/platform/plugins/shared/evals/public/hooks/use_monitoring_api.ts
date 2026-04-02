/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { API_VERSIONS, EVALS_INTERNAL_URL } from '@kbn/evals-common';
import type { SkillPerformanceMetrics, SkillAlert } from '../../common/monitoring_types';
import { queryKeys } from '../query_keys';

const getSkillMetricsUrl = (skillId: string) =>
  `${EVALS_INTERNAL_URL}/skills/${skillId}/metrics` as const;

const getSkillDriftUrl = (skillId: string) =>
  `${EVALS_INTERNAL_URL}/skills/${skillId}/drift-check` as const;

const getSkillReEvaluateUrl = (skillId: string) =>
  `${EVALS_INTERNAL_URL}/skills/${skillId}/reevaluate` as const;

const getSkillAlertsUrl = (skillId: string) =>
  `${EVALS_INTERNAL_URL}/skills/${skillId}/alerts` as const;

const getAcknowledgeAlertUrl = (skillId: string, alertId: string) =>
  `${EVALS_INTERNAL_URL}/skills/${skillId}/alerts/${alertId}/acknowledge` as const;

export const useSkillMetrics = (skillId: string, from: string, to: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.monitoring.metrics(skillId, from, to),
    queryFn: async (): Promise<SkillPerformanceMetrics> => {
      return services.http!.get<SkillPerformanceMetrics>(getSkillMetricsUrl(skillId), {
        query: { from, to },
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: skillId.length > 0,
  });
};

export interface DriftCheckRequest {
  skillId: string;
  deployment_score: number;
  threshold?: number;
  evaluation_interval?: string;
}

export interface DriftCheckResponse {
  driftDetected: boolean;
  currentScore: number | null;
  delta: number | null;
}

export const useDriftCheck = () => {
  const { services } = useKibana();

  return useMutation({
    mutationFn: async ({ skillId, ...body }: DriftCheckRequest): Promise<DriftCheckResponse> => {
      return services.http!.post<DriftCheckResponse>(getSkillDriftUrl(skillId), {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
  });
};

export interface ReEvaluateSkillRequest {
  skillId: string;
  dataset_id: string;
  evaluators: string[];
  connector_id: string;
}

export interface ReEvaluateSkillResponse {
  score: number;
  evaluatorResults: unknown[];
}

export const useReEvaluateSkill = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      skillId,
      ...body
    }: ReEvaluateSkillRequest): Promise<ReEvaluateSkillResponse> => {
      return services.http!.post<ReEvaluateSkillResponse>(getSkillReEvaluateUrl(skillId), {
        body: JSON.stringify(body),
        version: API_VERSIONS.internal.v1,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.all });
    },
  });
};

export const useSkillAlerts = (skillId: string) => {
  const { services } = useKibana();

  return useQuery({
    queryKey: queryKeys.monitoring.alerts(skillId),
    queryFn: async (): Promise<{ alerts: SkillAlert[] }> => {
      return services.http!.get<{ alerts: SkillAlert[] }>(getSkillAlertsUrl(skillId), {
        version: API_VERSIONS.internal.v1,
      });
    },
    enabled: skillId.length > 0,
  });
};

export interface AcknowledgeAlertRequest {
  skillId: string;
  alertId: string;
}

export interface AcknowledgeAlertResponse {
  alert_id: string;
  skill_id: string;
  acknowledged: boolean;
  acknowledged_at: string;
}

export const useAcknowledgeAlert = () => {
  const { services } = useKibana();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      skillId,
      alertId,
    }: AcknowledgeAlertRequest): Promise<AcknowledgeAlertResponse> => {
      return services.http!.post<AcknowledgeAlertResponse>(
        getAcknowledgeAlertUrl(skillId, alertId),
        {
          version: API_VERSIONS.internal.v1,
        }
      );
    },
    onSuccess: async (response, { skillId }) => {
      if (response.acknowledged) {
        await queryClient.invalidateQueries({ queryKey: queryKeys.monitoring.alerts(skillId) });
      }
    },
  });
};
