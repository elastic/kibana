/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type { TypeOf } from '@kbn/config-schema';
import type {
  singleMetricViewerEmbeddableCustomInputSchema,
  singleMetricViewerEmbeddableInputSchema,
  singleMetricViewerEmbeddableStateSchema,
  singleMetricViewerEmbeddableUserInputSchema,
} from '../../../server/embeddable/single_metric_viewer/single_metric_viewer';

export type MlEntity = Record<string, MlEntityField['fieldValue']>;

export type SingleMetricViewerEmbeddableUserInput = TypeOf<
  typeof singleMetricViewerEmbeddableUserInputSchema
>;

export type SingleMetricViewerEmbeddableCustomInput = TypeOf<
  typeof singleMetricViewerEmbeddableCustomInputSchema
>;

export type SingleMetricViewerEmbeddableState = TypeOf<
  typeof singleMetricViewerEmbeddableStateSchema
>;

export type SingleMetricViewerEmbeddableInput = TypeOf<
  typeof singleMetricViewerEmbeddableInputSchema
>;
