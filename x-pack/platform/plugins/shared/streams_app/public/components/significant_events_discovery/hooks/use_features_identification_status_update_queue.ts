/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IdentifyFeaturesResult, TaskResult } from '@kbn/streams-schema';
import { useFeaturesQueriesSubtaskApi } from '../../../hooks/use_features_queries_subtask_api';
import { useStatusUpdateQueue } from './use_status_update_queue';

type StreamFeaturesStatusUpdateCallback = (
  streamName: string,
  status: TaskResult<IdentifyFeaturesResult>
) => void;

export function useFeaturesIdentificationStatusUpdateQueue(
  onStreamStatusUpdate: StreamFeaturesStatusUpdateCallback
) {
  const { getFeaturesIdentificationStatus } = useFeaturesQueriesSubtaskApi();
  const { statusUpdateQueue, processStatusUpdateQueue } = useStatusUpdateQueue(
    getFeaturesIdentificationStatus,
    onStreamStatusUpdate
  );

  return { featuresIdentificationStatusUpdateQueue: statusUpdateQueue, processStatusUpdateQueue };
}
