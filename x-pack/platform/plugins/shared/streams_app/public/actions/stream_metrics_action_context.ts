/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiIsOfType } from '@kbn/presentation-publishing/interfaces/has_type';
import { STREAM_METRICS_EMBEDDABLE_ID } from '../../common/embeddable';
import type { StreamMetricsApi } from '../embeddable/types';

export interface StreamMetricsActionContext extends EmbeddableApiContext {
  embeddable: StreamMetricsApi;
}

export function isStreamMetricsEmbeddableContext(
  arg: unknown
): arg is StreamMetricsActionContext {
  return (
    isPopulatedObject(arg, ['embeddable']) &&
    apiIsOfType(arg.embeddable, STREAM_METRICS_EMBEDDABLE_ID)
  );
}
