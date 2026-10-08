/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useMemo, useCallback, useEffect } from 'react';
import useSessionStorage from 'react-use/lib/useSessionStorage';
import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
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
  getDuplicateInstanceIdPrefix,
  type ServiceSettingsPersistedState,
} from '../service_settings_step/use_service_settings';

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

// Step 4 reports per service, so a service is receiving when any of its instances is.
function getServiceInstancePatterns(
  serviceId: string,
  entry: AwsServiceMatrixEntry,
  serviceSettings: ServiceSettingsPersistedState
): string[] {
  const { instances, serviceVars = {} } = serviceSettings;
  // A resumed session restores serviceVars but not instances. The original always exists but may
  // have no saved vars, so rebuild it from the service id plus any saved duplicate keys.
  const instanceIds = instances
    ? instances.filter((inst) => inst.serviceId === serviceId).map((inst) => inst.instanceId)
    : [
        serviceId,
        ...Object.keys(serviceVars).filter((id) =>
          id.startsWith(getDuplicateInstanceIdPrefix(serviceId))
        ),
      ];
  if (instanceIds.length === 0) instanceIds.push(serviceId);
  const patterns = instanceIds.flatMap((instanceId) =>
    getServiceIndexPatterns(entry, serviceVars[instanceId]?.namespace)
  );
  return [...new Set(patterns)];
}

export interface ServiceDataDetectionResult {
  /** Merged status per instance — polling result overlaid on top of context state. */
  statusByInstanceId: Record<string, ServiceChipState>;
  receivingCount: number;
  totalCount: number;
  isTimedOut: boolean;
}

export function useServiceDataDetection(): ServiceDataDetectionResult {
  const { services } = useKibana<CoreStart>();
  const { servicesStep, detectAndReviewStep, awsServicesMap, updateDetectAndReviewStep } =
    useOnboardingFlow();
  const { selectedServiceIds } = servicesStep;
  const { serviceStatuses, deployErrors } = detectAndReviewStep;
  const [storedSettings] = useSessionStorage<ServiceSettingsPersistedState>(
    SERVICE_SETTINGS_SESSION_KEY,
    DEFAULT_SERVICE_SETTINGS
  );
  const serviceSettings = storedSettings ?? DEFAULT_SERVICE_SETTINGS;

  // Compute once on mount so the window doesn't reset on re-renders.
  const startRef = useRef<string>(new Date(Date.now() - LOOKBACK_MS).toISOString());
  const mountTimeRef = useRef<number>(Date.now());

  const isTimedOut = Date.now() - mountTimeRef.current >= TIMEOUT_MS;

  // Collect all index patterns across selected services.
  // Filter to only concrete patterns (type-dataset-*) — fallback glob patterns are skipped
  // since they won't pass server-side validation and don't represent known data streams.
  const patternsByServiceId = useMemo(() => {
    const byId = new Map<string, string[]>();
    for (const id of selectedServiceIds) {
      const entry = awsServicesMap?.get(id);
      if (entry) byId.set(id, getServiceInstancePatterns(id, entry, serviceSettings));
    }
    return byId;
  }, [selectedServiceIds, awsServicesMap, serviceSettings]);

  const allPatterns = useMemo(() => {
    const patterns = new Set<string>();
    for (const servicePatterns of patternsByServiceId.values()) {
      for (const p of servicePatterns) {
        if (isValidDataStreamIndexPattern(p)) patterns.add(p);
      }
    }
    return [...patterns];
  }, [patternsByServiceId]);

  // Derive current merged statuses without polling.
  const mergedStatuses = useMemo((): Record<string, ServiceChipState> => {
    const result: Record<string, ServiceChipState> = {};
    for (const id of selectedServiceIds) {
      result[id] = serviceStatuses[id] ?? 'instantiating';
    }
    return result;
  }, [selectedServiceIds, serviceStatuses]);

  const allReceiving = useMemo(
    () =>
      selectedServiceIds.length > 0 &&
      selectedServiceIds.every((id) => mergedStatuses[id] === 'receiving'),
    [selectedServiceIds, mergedStatuses]
  );

  const shouldPoll = allPatterns.length > 0 && !allReceiving && !isTimedOut;

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

  // Promote 'detecting' → 'receiving' for any service whose patterns have data.
  // Write promotions into context so they survive a remount.
  const promoteToReceiving = useCallback(
    (nextStatuses: Record<string, ServiceChipState>) => {
      const updates: Record<string, ServiceChipState> = {};
      for (const [id, status] of Object.entries(nextStatuses)) {
        if (status === 'receiving' && serviceStatuses[id] !== 'receiving') {
          updates[id] = 'receiving';
        }
      }
      if (Object.keys(updates).length > 0) {
        updateDetectAndReviewStep({ serviceStatuses: updates });
      }
    },
    [serviceStatuses, updateDetectAndReviewStep]
  );

  // Build final status per instance by overlaying query results on context state.
  const statusByInstanceId = useMemo((): Record<string, ServiceChipState> => {
    const result: Record<string, ServiceChipState> = {};

    for (const id of selectedServiceIds) {
      const contextStatus = serviceStatuses[id] ?? 'instantiating';

      // Error from context wins — don't let a query result override a deployment failure.
      if (deployErrors[id] || contextStatus === 'error') {
        result[id] = 'error';
        continue;
      }

      if (contextStatus === 'receiving') {
        result[id] = 'receiving';
        continue;
      }

      // Check if any of this service's patterns have data.
      const patterns = patternsByServiceId.get(id);
      if (
        queryData &&
        patterns &&
        (contextStatus === 'detecting' || contextStatus === 'instantiating')
      ) {
        const hasData = patterns.some((p) => queryData.results[p] === true);
        if (hasData) {
          result[id] = 'receiving';
          continue;
        }
      }

      // Timeout takes priority over detecting (policy exists but no data after 10 min).
      if (isTimedOut && (contextStatus === 'detecting' || contextStatus === 'instantiating')) {
        result[id] = 'timeout';
        continue;
      }

      result[id] = contextStatus;
    }

    return result;
  }, [
    selectedServiceIds,
    patternsByServiceId,
    serviceStatuses,
    deployErrors,
    queryData,
    isTimedOut,
  ]);

  // Persist promotions after render — writing to the provider's state during this hook's render
  // would be a render-phase side effect on an ancestor component. The `!== 'receiving'` guard in
  // promoteToReceiving keeps this from looping.
  useEffect(() => {
    promoteToReceiving(statusByInstanceId);
  }, [statusByInstanceId, promoteToReceiving]);

  const receivingCount = useMemo(
    () => Object.values(statusByInstanceId).filter((s) => s === 'receiving').length,
    [statusByInstanceId]
  );

  return {
    statusByInstanceId,
    receivingCount,
    totalCount: selectedServiceIds.length,
    isTimedOut,
  };
}
