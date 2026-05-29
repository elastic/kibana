/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE } from '@kbn/ml-common-types/embeddables/single_metric_viewer';
import { singleMetricViewerEmbeddableStateSchema } from '@kbn/ml-server-schemas/embeddables/single_metric_viewer';
import { transformIn } from '../../common/embeddables/single_metric_viewer/transform_in';
import { transformOut } from '../../common/embeddables/single_metric_viewer/transform_out';
import type { MlFeatures } from '../../common/constants/app';

export function registerEmbeddables(embeddable: EmbeddableSetup, enabledFeatures: MlFeatures) {
  if (enabledFeatures.ad !== true) return;

  embeddable.registerEmbeddableServerDefinition(ANOMALY_SINGLE_METRIC_VIEWER_EMBEDDABLE_TYPE, {
    title: 'Single metric viewer',
    getSchema: () => singleMetricViewerEmbeddableStateSchema,
    getTransforms: () => ({ transformIn, transformOut }),
  });
}
