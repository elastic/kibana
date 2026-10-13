/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useMemo, useEffect } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import type { AgentPolicy, PackagePolicy } from '@kbn/fleet-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DATA_STREAM_API_ROUTES, isValidDataStreamIndexPattern } from '@kbn/fleet-plugin/common';
import type { ServiceChipState } from '../../onboarding_flow_context';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import type { AwsServiceMatrixEntry } from '../../aws_service_matrix';
import { getServiceIndexPatterns } from '../../common/service_index_patterns';
import type { HasDataResponse } from '../../../../common/core/detection_api';
import {
  DEFAULT_SERVICE_SETTINGS,
  SERVICE_SETTINGS_SESSION_KEY,
  type ServiceSettingsPersistedState,
} from '../service_settings_step/use_service_settings';
import {
  aggregateInstanceChipStates,
  deriveInstanceChipState,
  pickWorstAgentInstanceId,
  type InstanceAgentSummary,
} from './agent_detection';
import { getServiceInstanceIds } from './service_instances';
import { useAgentDetection } from './use_agent_detection';

const POLL_INTERVAL_MS = 10_000;
const TIMEOUT_MS = 10 * 60 * 1_000; // 10 minutes
const LOOKBACK_MS = 30 * 60 * 1_000; // 30-minute window survives Back/forward

// Matches the maxLength Fleet puts on the has_data `dataStreams` query param.
const MAX_DATA_STREAMS_PARAM_LENGTH = 4096;

function batchPatterns(patterns: string[]): string[] {
  const batches: string[] = [];
  let current = '';
  for (const pattern of patterns) {
    const next = current ? `${current},${pattern}` : pattern;
    if (current && next.length > MAX_DATA_STREAMS_PARAM_LENGTH) {
      batches.push(current);
      current = pattern;
    } else {
      current = next;
    }
  }
  if (current) batches.push(current);
  return batches;
}

// ECF instances have no Fleet agent, so only they are detected through index patterns.
function getEcfInstancePatterns(
  entry: AwsServiceMatrixEntry,
  ecfInstanceIds: string[],
  serviceSettings: ServiceSettingsPersistedState
): string[] {
  const { serviceVars = {} } = serviceSettings;
  const patterns = ecfInstanceIds.flatMap((instanceId) =>
    getServiceIndexPatterns(entry, serviceVars[instanceId]?.namespace)
  );
  return [...new Set(patterns)];
}

/** The Fleet agent behind a service tile — the worst instance when a service is duplicated. */
export interface ServiceAgentInfo extends InstanceAgentSummary {
  /** Id the instance was deployed under: the agentless policy id, or the package policy id. */
  policyId: string;
  agentPolicy?: AgentPolicy;
  packagePolicy?: PackagePolicy;
}

export interface ServiceDataDetectionResult {
  /** Merged status per service — polling result overlaid on top of context state. */
  statusByInstanceId: Record<string, ServiceChipState>;
  /** Services deployed through Fleet. ECF services have none and show no agent badge. */
  agentInfoByServiceId: Record<string, ServiceAgentInfo>;
  receivingCount: number;
  totalCount: number;
  isTimedOut: boolean;
}

export function useServiceDataDetection(): ServiceDataDetectionResult {
  const { services } = useKibana<CoreStart>();
  const { servicesStep, detectAndReviewStep, awsServicesMap, updateDetectAndReviewStep } =
    useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;
  const { serviceStatuses, deployErrors, policyIdsByInstance = {} } = detectAndReviewStep;
  const [storedSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const serviceSettings = storedSettings ?? DEFAULT_SERVICE_SETTINGS;

  // Compute once on mount so the window doesn't reset on re-renders.
  const startRef = useRef<string>(new Date(Date.now() - LOOKBACK_MS).toISOString());
  const mountTimeRef = useRef<number>(Date.now());

  const isTimedOut = Date.now() - mountTimeRef.current >= TIMEOUT_MS;

  const instanceIdsByServiceId = useMemo(() => {
    const byId = new Map<string, string[]>();
    for (const id of selectedServiceIds) {
      byId.set(id, getServiceInstanceIds(id, serviceSettings));
    }
    return byId;
  }, [selectedServiceIds, serviceSettings]);

  const instances = useMemo(
    () =>
      [...instanceIdsByServiceId].flatMap(([serviceId, instanceIds]) =>
        instanceIds.map((instanceId) => ({ instanceId, serviceId }))
      ),
    [instanceIdsByServiceId]
  );

  // Index patterns for ECF instances only. Instances deployed through Fleet have an agent and are
  // detected through the agent data API, which is immune to a customised data_stream.dataset.
  // Filter to only concrete patterns (type-dataset-*) — fallback glob patterns are skipped
  // since they won't pass server-side validation and don't represent known data streams.
  const patternsByServiceId = useMemo(() => {
    const byId = new Map<string, string[]>();
    for (const [serviceId, instanceIds] of instanceIdsByServiceId) {
      const entry = awsServicesMap?.get(serviceId);
      const ecfInstanceIds = instanceIds.filter((instanceId) => !policyIdsByInstance[instanceId]);
      if (entry && ecfInstanceIds.length > 0) {
        byId.set(serviceId, getEcfInstancePatterns(entry, ecfInstanceIds, serviceSettings));
      }
    }
    return byId;
  }, [instanceIdsByServiceId, awsServicesMap, serviceSettings, policyIdsByInstance]);

  const allPatterns = useMemo(() => {
    const patterns = new Set<string>();
    for (const servicePatterns of patternsByServiceId.values()) {
      for (const p of servicePatterns) {
        if (isValidDataStreamIndexPattern(p)) patterns.add(p);
      }
    }
    return [...patterns];
  }, [patternsByServiceId]);

  const allReceiving = useMemo(
    () =>
      instances.length > 0 &&
      instances.every(({ instanceId }) => serviceStatuses[instanceId] === 'receiving'),
    [instances, serviceStatuses]
  );

  const shouldPollAgents = !allReceiving && !isTimedOut;
  const shouldPoll = allPatterns.length > 0 && shouldPollAgents;

  const { data: queryData } = useQuery<HasDataResponse>({
    queryKey: ['ingest_hub', 'has_data', allPatterns.join(','), startRef.current],
    queryFn: async () => {
      const responses = await Promise.all(
        batchPatterns(allPatterns).map((dataStreams) =>
          services.http.get<HasDataResponse>(DATA_STREAM_API_ROUTES.HAS_DATA_PATTERN, {
            query: { dataStreams, start: startRef.current },
          })
        )
      );
      return { results: Object.assign({}, ...responses.map(({ results }) => results)) };
    },
    refetchInterval: shouldPoll ? POLL_INTERVAL_MS : false,
    enabled: shouldPoll,
  });

  const {
    summaryByInstanceId,
    hasDataByInstanceId,
    agentPolicyByInstanceId,
    packagePolicyByInstanceId,
  } = useAgentDetection({ instances, shouldPoll: shouldPollAgents });

  // Chip state per instance: context state overlaid with the agent and data signals.
  const instanceStates = useMemo((): Record<string, ServiceChipState> => {
    const result: Record<string, ServiceChipState> = {};
    for (const { instanceId, serviceId } of instances) {
      const agentSummary = summaryByInstanceId[instanceId];
      const patterns = patternsByServiceId.get(serviceId);
      const hasData = agentSummary
        ? !!hasDataByInstanceId[instanceId]
        : !!queryData && !!patterns && patterns.some((p) => queryData.results[p] === true);
      result[instanceId] = deriveInstanceChipState({
        contextStatus: serviceStatuses[instanceId] ?? 'instantiating',
        deployError: !!deployErrors[instanceId],
        agentHealth: agentSummary?.health,
        hasData,
        isTimedOut,
      });
    }
    return result;
  }, [
    instances,
    summaryByInstanceId,
    hasDataByInstanceId,
    patternsByServiceId,
    queryData,
    serviceStatuses,
    deployErrors,
    isTimedOut,
  ]);

  // Step 4 shows one tile per service, so a duplicated service folds its instances together.
  const statusByInstanceId = useMemo((): Record<string, ServiceChipState> => {
    const result: Record<string, ServiceChipState> = {};
    for (const [serviceId, instanceIds] of instanceIdsByServiceId) {
      result[serviceId] = aggregateInstanceChipStates(
        instanceIds.map((instanceId) => instanceStates[instanceId])
      );
    }
    return result;
  }, [instanceIdsByServiceId, instanceStates]);

  const agentInfoByServiceId = useMemo(() => {
    const result: Record<string, ServiceAgentInfo> = {};
    for (const [serviceId, instanceIds] of instanceIdsByServiceId) {
      const instanceId = pickWorstAgentInstanceId(summaryByInstanceId, instanceIds);
      if (!instanceId) continue;
      result[serviceId] = {
        ...summaryByInstanceId[instanceId],
        policyId: policyIdsByInstance[instanceId],
        agentPolicy: agentPolicyByInstanceId[instanceId],
        packagePolicy: packagePolicyByInstanceId[instanceId],
      };
    }
    return result;
  }, [
    instanceIdsByServiceId,
    summaryByInstanceId,
    policyIdsByInstance,
    agentPolicyByInstanceId,
    packagePolicyByInstanceId,
  ]);

  // Persist promotions after render — writing to the provider's state during this hook's render
  // would be a render-phase side effect on an ancestor component. The `!== 'receiving'` guard
  // keeps this from looping.
  useEffect(() => {
    const updates: Record<string, ServiceChipState> = {};
    for (const [instanceId, status] of Object.entries(instanceStates)) {
      if (status === 'receiving' && serviceStatuses[instanceId] !== 'receiving') {
        updates[instanceId] = 'receiving';
      }
    }
    if (Object.keys(updates).length > 0) {
      updateDetectAndReviewStep({ serviceStatuses: updates });
    }
  }, [instanceStates, serviceStatuses, updateDetectAndReviewStep]);

  const receivingCount = useMemo(
    () => Object.values(statusByInstanceId).filter((s) => s === 'receiving').length,
    [statusByInstanceId]
  );

  return {
    statusByInstanceId,
    agentInfoByServiceId,
    receivingCount,
    totalCount: selectedServiceIds.length,
    isTimedOut,
  };
}
