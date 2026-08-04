/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiHorizontalRule } from '@elastic/eui';
import type { Streams } from '@kbn/streams-schema';
import { usePerformanceContext } from '@kbn/ebt-tools';
import { getTimeDifferenceInSeconds } from '@kbn/timerange';
import { StreamDetailFailureStore } from './failure_store';
import { StreamDetailGeneralData } from './general_data';
import { useDataStreamStats } from './hooks/use_data_stream_stats';
import { useTimefilter } from '../../../../hooks/use_timefilter';
import { getStreamTypeFromDefinition } from '../../../../util/get_stream_type_from_definition';
import {
  LifecycleFlyoutCoordinationProvider,
  STREAM_LIFECYCLE_FLYOUT_IDS,
  useLifecycleFlyoutCoordination,
  useRegisterLifecycleFlyoutOpen,
} from './common/hooks/lifecycle_flyout_coordination';
import { useImportLifecycleFlyout, useImportLifecycleFlyoutContext } from './import_from_stream';

export function StreamDetailLifecycle({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) {
  return (
    <LifecycleFlyoutCoordinationProvider>
      <StreamDetailLifecycleInner definition={definition} refreshDefinition={refreshDefinition} />
    </LifecycleFlyoutCoordinationProvider>
  );
}

function StreamDetailLifecycleInner({
  definition,
  refreshDefinition,
}: {
  definition: Streams.ingest.all.GetResponse;
  refreshDefinition: () => void;
}) {
  const { timeState } = useTimefilter();
  const data = useDataStreamStats({ definition, timeState });

  const {
    isOpen: isImportFlyoutOpen,
    flyout: importFlyout,
    previewLifecycle: importPreviewLifecycle,
    previewFailureStore: importPreviewFailureStore,
    ilmPolicies: importPreviewIlmPolicies,
    hasImportableStreams,
    isLoadingStreams: isLoadingImportStreams,
  } = useImportLifecycleFlyout({ definition, refreshDefinition });
  useRegisterLifecycleFlyoutOpen(STREAM_LIFECYCLE_FLYOUT_IDS.importLifecycle, isImportFlyoutOpen);
  const { isAnyFlyoutOpen } = useLifecycleFlyoutCoordination();
  const importLifecycleFlyoutContext = useImportLifecycleFlyoutContext();
  const setImportLifecycleFlyoutDisabled = importLifecycleFlyoutContext?.setIsDisabled;
  const isImportLifecycleFlyoutDisabled =
    isAnyFlyoutOpen || isLoadingImportStreams || !hasImportableStreams;

  useEffect(() => {
    setImportLifecycleFlyoutDisabled?.(isImportLifecycleFlyoutDisabled);
    return () => setImportLifecycleFlyoutDisabled?.(false);
  }, [isImportLifecycleFlyoutDisabled, setImportLifecycleFlyoutDisabled]);

  const { onPageReady } = usePerformanceContext();

  const queryRangeSeconds = getTimeDifferenceInSeconds(timeState.timeRange);

  // Telemetry for TTFMP (time to first meaningful paint)
  useEffect(() => {
    if (definition && !data.isLoading) {
      const streamType = getStreamTypeFromDefinition(definition.stream);
      onPageReady({
        meta: {
          description: `[ttfmp_streams_detail_retention] streamType: ${streamType}`,
        },
        customMetrics: {
          key1: 'dataStreamStatsTotalDocs',
          value1: data.stats?.ds?.stats?.totalDocs ?? 0,
          key2: 'timeFrom',
          value2: timeState.start,
          key3: 'timeTo',
          value3: timeState.end,
          key4: 'queryRangeSeconds',
          value4: queryRangeSeconds,
        },
      });
    }
  }, [
    definition,
    data.isLoading,
    onPageReady,
    data.stats?.ds?.stats?.totalDocs,
    timeState.start,
    timeState.end,
    queryRangeSeconds,
  ]);

  return (
    <EuiFlexGroup gutterSize="m" direction="column">
      <StreamDetailGeneralData
        definition={definition}
        refreshDefinition={refreshDefinition}
        data={data}
        isImportFlyoutOpen={isImportFlyoutOpen}
        importPreviewLifecycle={importPreviewLifecycle}
        importPreviewIlmPolicies={importPreviewIlmPolicies}
      />
      <EuiHorizontalRule margin="m" />
      <StreamDetailFailureStore
        definition={definition}
        data={data}
        refreshDefinition={refreshDefinition}
        isImportFlyoutOpen={isImportFlyoutOpen}
        importPreviewFailureStore={importPreviewFailureStore}
      />
      {importFlyout}
    </EuiFlexGroup>
  );
}
