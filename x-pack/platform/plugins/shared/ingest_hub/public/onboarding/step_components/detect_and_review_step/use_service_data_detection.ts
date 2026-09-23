/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@kbn/react-query';
import type { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { DATA_STREAM_API_ROUTES, DATA_STREAM_INDEX_PATTERN_REGEX } from '@kbn/fleet-plugin/common';
import type { ServiceChipState } from '../../onboarding_flow_context';
import { useOnboardingFlow } from '../../onboarding_flow_context';
import { getServiceIndexPatterns } from '../../common/service_index_patterns';
import type { HasDataResponse } from '../../../../common/detection_api';

const POLL_INTERVAL_MS = 10_000;
const TIMEOUT_MS = 10 * 60 * 1_000; // 10 minutes
const LOOKBACK_MS = 30 * 60 * 1_000; // 30-minute window survives Back/forward

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

  // Compute once on mount so the window doesn't reset on re-renders.
  const startRef = useRef<string>(new Date(Date.now() - LOOKBACK_MS).toISOString());
  const mountTimeRef = useRef<number>(Date.now());

  const isTimedOut = Date.now() - mountTimeRef.current >= TIMEOUT_MS;

  // Collect all index patterns across selected services.
  // Filter to only concrete patterns (type-dataset-*) — fallback glob patterns are skipped
  // since they won't pass server-side validation and don't represent known data streams.
  const allPatterns = useMemo(() => {
    const patterns: string[] = [];
    for (const id of selectedServiceIds) {
      const entry = awsServicesMap?.get(id);
      if (entry) {
        for (const p of getServiceIndexPatterns(entry)) {
          if (DATA_STREAM_INDEX_PATTERN_REGEX.test(p) && !patterns.includes(p)) patterns.push(p);
        }
      }
    }
    return patterns;
  }, [selectedServiceIds, awsServicesMap]);

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
    queryFn: () =>
      services.http.get<HasDataResponse>(DATA_STREAM_API_ROUTES.HAS_DATA_PATTERN, {
        query: { dataStreams: allPatterns.join(','), start: startRef.current },
      }),
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
      const entry = awsServicesMap?.get(id);
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
      if (
        queryData &&
        entry &&
        (contextStatus === 'detecting' || contextStatus === 'instantiating')
      ) {
        const patterns = getServiceIndexPatterns(entry);
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
  }, [selectedServiceIds, awsServicesMap, serviceStatuses, deployErrors, queryData, isTimedOut]);

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
