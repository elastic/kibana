/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { PublishesWritableTitle, SerializedTitles } from '@kbn/presentation-publishing';

export interface StreamMetricsState {
  streamName: string | undefined;
}

export type StreamMetricsSerializedState = SerializedTitles & StreamMetricsState;

export type StreamMetricsApi = DefaultEmbeddableApi<StreamMetricsSerializedState> &
  PublishesWritableTitle & {
    setStreamName: (streamName: string | undefined) => void;
  };
