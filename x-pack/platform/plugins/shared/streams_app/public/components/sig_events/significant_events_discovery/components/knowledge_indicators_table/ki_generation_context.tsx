/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceConnector } from '@kbn/inference-common';
import type { ListStreamDetail } from '@kbn/streams-plugin/server/routes/internal/streams/crud/route';
import type { OnboardingResult, TaskResult } from '@kbn/streams-schema';
import { TaskStatus } from '@kbn/streams-schema';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useConnectorConfig } from '../../../../../hooks/sig_events/use_connector_config';
import { useIndexPatternsConfig } from '../../../../../hooks/use_index_patterns_config';
import type { ScheduleOnboardingOptions } from '../../../../../hooks/use_onboarding_api';
import { useBulkOnboarding } from '../../hooks/use_bulk_onboarding';
import { useFetchStreams } from '../../hooks/use_fetch_streams';
import type { OnboardingConfig } from '../shared/types';

const IN_PROGRESS_STATUSES: readonly TaskStatus[] = [
  TaskStatus.InProgress,
  TaskStatus.BeingCanceled,
];

type StreamStatusCallback = (streamName: string, taskResult: TaskResult<OnboardingResult>) => void;

interface ConnectorState {
  resolvedConnectorId: string | undefined;
  loading: boolean;
}

interface KiGenerationContextValue {
  filteredStreams: ListStreamDetail[] | undefined;
  isStreamsLoading: boolean;
  isInitialGenerationStatusLoading: boolean;
  generatingStreamNames: string[];
  isGenerating: boolean;
  isScheduling: boolean;
  streamStatusMap: Record<string, TaskResult<OnboardingResult>>;
  generationCompletedAt: number | undefined;
  onboardingConfig: OnboardingConfig;
  setOnboardingConfig: (config: OnboardingConfig) => void;
  allConnectors: InferenceConnector[];
  connectorError: Error | undefined;
  featuresConnectors: ConnectorState;
  queriesConnectors: ConnectorState;
  discoveryConnectors: ConnectorState;
  isConnectorCatalogUnavailable: boolean;
  discoveryConnectorOverride: string | undefined;
  setDiscoveryConnectorOverride: (id: string | undefined) => void;
  displayDiscoveryConnectorId: string | undefined;
  bulkOnboardAll: (streamNames: string[]) => Promise<string[]>;
  bulkOnboardFeaturesOnly: (streamNames: string[]) => Promise<string[]>;
  bulkOnboardQueriesOnly: (streamNames: string[]) => Promise<string[]>;
  bulkScheduleOnboardingTask: (
    streamNames: string[],
    options?: ScheduleOnboardingOptions
  ) => Promise<string[]>;
  cancelOnboardingTask: (streamName: string) => Promise<void>;
  isStreamActionable: (streamName: string) => boolean;
  registerStatusCallback: (cb: StreamStatusCallback) => () => void;
}

const KiGenerationReactContext = createContext<KiGenerationContextValue | null>(null);

export function KiGenerationProvider({ children }: { children: React.ReactNode }) {
  const [generatingStreams, setGeneratingStreams] = useState<Set<string>>(new Set());
  const [streamStatusMap, setStreamStatusMap] = useState<
    Record<string, TaskResult<OnboardingResult>>
  >({});
  const [generationCompletedAt, setGenerationCompletedAt] = useState<number | undefined>(undefined);
  const statusCallbacksRef = useRef<Set<StreamStatusCallback>>(new Set());
  const prevGeneratingSizeRef = useRef(0);
  // Ref gates callback forwarding without stale closures; state flag drives
  // useMemo reactivity for isInitialGenerationStatusLoading.
  const initialStatusFetchDoneRef = useRef(false);
  const [initialStatusFetchDone, setInitialStatusFetchDone] = useState(false);
  const enqueuedStreamNamesRef = useRef<Set<string>>(new Set());

  const { filterStreamsByIndexPatterns } = useIndexPatternsConfig();
  const {
    onboardingConfig,
    setOnboardingConfig,
    allConnectors,
    connectorError,
    featuresConnectors,
    queriesConnectors,
    discoveryConnectors,
    isConnectorCatalogUnavailable,
    discoveryConnectorOverride,
    setDiscoveryConnectorOverride,
    displayDiscoveryConnectorId,
  } = useConnectorConfig();

  const streamsListFetch = useFetchStreams({
    select: (result) => ({
      ...result,
      streams: filterStreamsByIndexPatterns(result.streams),
    }),
  });
  const filteredStreams = streamsListFetch.data?.streams;
  const isStreamsLoading = streamsListFetch.isLoading;

  const registerStatusCallback = useCallback((cb: StreamStatusCallback) => {
    statusCallbacksRef.current.add(cb);
    return () => {
      statusCallbacksRef.current.delete(cb);
    };
  }, []);

  useEffect(() => {
    if (prevGeneratingSizeRef.current > 0 && generatingStreams.size === 0) {
      setGenerationCompletedAt(Date.now());
    }
    prevGeneratingSizeRef.current = generatingStreams.size;
  }, [generatingStreams]);

  const markAsGenerating = useCallback((streamNames: string[]) => {
    if (streamNames.length === 0) return;
    setGeneratingStreams((current) => {
      const next = new Set(current);
      streamNames.forEach((s) => next.add(s));
      return next;
    });
  }, []);

  // Bidirectional: adds streams discovered as InProgress (e.g. on initial status
  // fetch after page refresh) and removes streams that reach a terminal state.
  // Callback forwarding is gated on the initial-fetch flag so initial-load
  // updates don't trigger consumer side effects (like error toasts).
  const onStreamStatusUpdate = useCallback(
    (streamName: string, taskResult: TaskResult<OnboardingResult>) => {
      setStreamStatusMap((current) => ({ ...current, [streamName]: taskResult }));

      const isInProgress = IN_PROGRESS_STATUSES.includes(taskResult.status);

      setGeneratingStreams((current) => {
        const has = current.has(streamName);
        if (isInProgress === has) return current;
        const next = new Set(current);
        if (isInProgress) {
          next.add(streamName);
        } else {
          next.delete(streamName);
        }
        return next;
      });

      if (initialStatusFetchDoneRef.current) {
        statusCallbacksRef.current.forEach((cb) => cb(streamName, taskResult));
      }
    },
    []
  );

  const bulkOnboarding = useBulkOnboarding({ onboardingConfig, onStreamStatusUpdate });
  const {
    onboardingStatusUpdateQueue,
    processStatusUpdateQueue,
    bulkOnboardAll: rawBulkOnboardAll,
    bulkOnboardFeaturesOnly: rawBulkOnboardFeaturesOnly,
    bulkOnboardQueriesOnly: rawBulkOnboardQueriesOnly,
    bulkScheduleOnboardingTask: rawBulkScheduleOnboardingTask,
  } = bulkOnboarding;

  useEffect(() => {
    if (!filteredStreams) return;

    let hasNew = false;
    filteredStreams.forEach((item) => {
      if (!enqueuedStreamNamesRef.current.has(item.stream.name)) {
        enqueuedStreamNamesRef.current.add(item.stream.name);
        onboardingStatusUpdateQueue.add(item.stream.name);
        hasNew = true;
      }
    });
    if (hasNew) {
      processStatusUpdateQueue().finally(() => {
        initialStatusFetchDoneRef.current = true;
        setInitialStatusFetchDone(true);
      });
    }
  }, [filteredStreams, onboardingStatusUpdateQueue, processStatusUpdateQueue]);

  const isGenerating = generatingStreams.size > 0;
  const generatingStreamNames = useMemo(() => Array.from(generatingStreams), [generatingStreams]);

  // True until we've received at least one status result for every filtered
  // stream, so consumers can defer rendering empty/generating UI until the
  // generating set is known. Once false, stays false — transient refetches of
  // the streams list must not flash the loading panel again.
  const isInitialGenerationStatusLoading = useMemo(() => {
    if (initialStatusFetchDone) return false;
    if (isStreamsLoading || !filteredStreams) return true;
    return filteredStreams.some((item) => !(item.stream.name in streamStatusMap));
  }, [initialStatusFetchDone, isStreamsLoading, filteredStreams, streamStatusMap]);

  const unmarkFailedStreams = useCallback((requested: string[], succeeded: string[]) => {
    if (succeeded.length === requested.length) return;
    const succeededSet = new Set(succeeded);
    const failed = requested.filter((s) => !succeededSet.has(s));
    if (failed.length === 0) return;
    setGeneratingStreams((current) => {
      const next = new Set(current);
      failed.forEach((s) => next.delete(s));
      return next;
    });
  }, []);

  const bulkOnboardAll = useCallback(
    async (streamNames: string[]): Promise<string[]> => {
      markAsGenerating(streamNames);
      const succeeded = await rawBulkOnboardAll(streamNames);
      unmarkFailedStreams(streamNames, succeeded);
      return succeeded;
    },
    [markAsGenerating, rawBulkOnboardAll, unmarkFailedStreams]
  );

  const bulkOnboardFeaturesOnly = useCallback(
    async (streamNames: string[]): Promise<string[]> => {
      markAsGenerating(streamNames);
      const succeeded = await rawBulkOnboardFeaturesOnly(streamNames);
      unmarkFailedStreams(streamNames, succeeded);
      return succeeded;
    },
    [markAsGenerating, rawBulkOnboardFeaturesOnly, unmarkFailedStreams]
  );

  const bulkOnboardQueriesOnly = useCallback(
    async (streamNames: string[]): Promise<string[]> => {
      markAsGenerating(streamNames);
      const succeeded = await rawBulkOnboardQueriesOnly(streamNames);
      unmarkFailedStreams(streamNames, succeeded);
      return succeeded;
    },
    [markAsGenerating, rawBulkOnboardQueriesOnly, unmarkFailedStreams]
  );

  const bulkScheduleOnboardingTask = useCallback(
    async (streamNames: string[], options?: ScheduleOnboardingOptions): Promise<string[]> => {
      markAsGenerating(streamNames);
      const succeeded = await rawBulkScheduleOnboardingTask(streamNames, options);
      unmarkFailedStreams(streamNames, succeeded);
      return succeeded;
    },
    [markAsGenerating, rawBulkScheduleOnboardingTask, unmarkFailedStreams]
  );

  const isStreamActionable = useCallback(
    (streamName: string) => {
      const result = streamStatusMap[streamName];
      if (!result) return false;
      return !IN_PROGRESS_STATUSES.includes(result.status);
    },
    [streamStatusMap]
  );

  const value = useMemo<KiGenerationContextValue>(
    () => ({
      isScheduling: bulkOnboarding.isScheduling,
      cancelOnboardingTask: bulkOnboarding.cancelOnboardingTask,
      filteredStreams,
      isStreamsLoading,
      isInitialGenerationStatusLoading,
      generatingStreamNames,
      isGenerating,
      streamStatusMap,
      generationCompletedAt,
      onboardingConfig,
      setOnboardingConfig,
      allConnectors,
      connectorError,
      featuresConnectors,
      queriesConnectors,
      discoveryConnectors,
      isConnectorCatalogUnavailable,
      discoveryConnectorOverride,
      setDiscoveryConnectorOverride,
      displayDiscoveryConnectorId,
      bulkOnboardAll,
      bulkOnboardFeaturesOnly,
      bulkOnboardQueriesOnly,
      bulkScheduleOnboardingTask,
      isStreamActionable,
      registerStatusCallback,
    }),
    [
      bulkOnboarding.isScheduling,
      bulkOnboarding.cancelOnboardingTask,
      filteredStreams,
      isStreamsLoading,
      isInitialGenerationStatusLoading,
      generatingStreamNames,
      isGenerating,
      streamStatusMap,
      generationCompletedAt,
      onboardingConfig,
      setOnboardingConfig,
      allConnectors,
      connectorError,
      featuresConnectors,
      queriesConnectors,
      discoveryConnectors,
      isConnectorCatalogUnavailable,
      discoveryConnectorOverride,
      setDiscoveryConnectorOverride,
      displayDiscoveryConnectorId,
      bulkOnboardAll,
      bulkOnboardFeaturesOnly,
      bulkOnboardQueriesOnly,
      bulkScheduleOnboardingTask,
      isStreamActionable,
      registerStatusCallback,
    ]
  );

  return (
    <KiGenerationReactContext.Provider value={value}>{children}</KiGenerationReactContext.Provider>
  );
}

export function useKiGeneration(): KiGenerationContextValue {
  const context = useContext(KiGenerationReactContext);
  if (!context) {
    throw new Error('useKiGeneration must be used within KiGenerationProvider');
  }
  return context;
}
