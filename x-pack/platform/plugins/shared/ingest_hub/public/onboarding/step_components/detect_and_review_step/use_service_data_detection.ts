/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useMemo, useCallback, useEffect, useState } from 'react';
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

// The index patterns of one instance, in its own namespace. Instances that cannot use the Fleet
// agent data API are detected through these.
function getInstancePatterns(
  entry: AwsServiceMatrixEntry,
  instanceId: string,
  serviceSettings: ServiceSettingsPersistedState
): string[] {
  const { serviceVars = {} } = serviceSettings;
  return getServiceIndexPatterns(entry, serviceVars[instanceId]?.namespace);
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

  // Whether to keep polling follows the current effective result, not the saved one. A saved
  // "receiving" can be overridden when an agent goes unhealthy, and polling must resume then.
  const [isSettled, setIsSettled] = useState(false);
  const shouldPollAgents = !isSettled && !isTimedOut;

  const {
    summaryByInstanceId,
    hasDataByInstanceId,
    dataSourceByInstanceId,
    agentPolicyByInstanceId,
    packagePolicyByInstanceId,
  } = useAgentDetection({ instances, shouldPoll: shouldPollAgents });

  // Instances detected through index patterns: ECF, which has no Fleet agent, and OTel on a policy
  // where the agent data API cannot attribute the data. The rest use the agent data API, which is
  // immune to a customised data_stream.dataset.
  // Filter to only concrete patterns (type-dataset-*) — fallback glob patterns are skipped
  // since they won't pass server-side validation and don't represent known data streams.
  const isPatternInstance = useCallback(
    (instanceId: string) =>
      !policyIdsByInstance[instanceId] || dataSourceByInstanceId[instanceId] === 'patterns',
    [policyIdsByInstance, dataSourceByInstanceId]
  );

  // Per instance: duplicates can sit in different namespaces, and one duplicate's data must not
  // mark another as receiving. Only the request below combines them.
  const patternsByInstanceId = useMemo(() => {
    const byId = new Map<string, string[]>();
    for (const [serviceId, instanceIds] of instanceIdsByServiceId) {
      const entry = awsServicesMap?.get(serviceId);
      if (!entry) continue;
      for (const instanceId of instanceIds.filter(isPatternInstance)) {
        byId.set(instanceId, getInstancePatterns(entry, instanceId, serviceSettings));
      }
    }
    return byId;
  }, [instanceIdsByServiceId, awsServicesMap, serviceSettings, isPatternInstance]);

  const allPatterns = useMemo(() => {
    const patterns = new Set<string>();
    for (const instancePatterns of patternsByInstanceId.values()) {
      for (const p of instancePatterns) {
        if (isValidDataStreamIndexPattern(p)) patterns.add(p);
      }
    }
    return [...patterns];
  }, [patternsByInstanceId]);

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

  // Chip state per instance: context state overlaid with the agent and data signals.
  const instanceStates = useMemo((): Record<string, ServiceChipState> => {
    const result: Record<string, ServiceChipState> = {};
    for (const { instanceId } of instances) {
      const agentSummary = summaryByInstanceId[instanceId];
      const patterns = patternsByInstanceId.get(instanceId);
      // A hit in the package's streams is only this integration's if an agent is running it; with
      // no live agent it can be another integration's data. Only ECF has no agent to wait for.
      const hasLiveAgent =
        !policyIdsByInstance[instanceId] || (agentSummary?.liveAgentIds.length ?? 0) > 0;
      const hasData = isPatternInstance(instanceId)
        ? !!queryData &&
          !!patterns &&
          patterns.some((p) => queryData.results[p] === true) &&
          hasLiveAgent
        : !!hasDataByInstanceId[instanceId];
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
    patternsByInstanceId,
    isPatternInstance,
    policyIdsByInstance,
    queryData,
    serviceStatuses,
    deployErrors,
    isTimedOut,
  ]);

  // Settled once every instance is effectively receiving. Evaluated on the effective states, so an
  // agent that goes unhealthy after a saved "receiving" turns polling back on.
  useEffect(() => {
    const states = Object.values(instanceStates);
    setIsSettled(states.length > 0 && states.every((state) => state === 'receiving'));
  }, [instanceStates]);

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
