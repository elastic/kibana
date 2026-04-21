/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { isByRefLensConfig } from '../common/transforms/utils';
import { LENS_DASHBOARD_APP_TYPE } from '../common/constants';
import { getTransformIn } from '../common/transforms/transform_in';
import { getTransformOut } from '../common/transforms/transform_out';
import type { LensTransforms } from '../common/transforms/types';
import { getLensPanelSchema } from './transforms';

export function registerLensEmbeddableTransformsForDashboardApp(
  embeddableSetup: EmbeddableSetup,
  builder: LensConfigBuilder
) {
  embeddableSetup.registerTransforms(LENS_DASHBOARD_APP_TYPE, {
    title: 'Visualization (dashboard application)',
    getTransforms: (drilldownTransforms) =>
      ({
        transformIn: getTransformIn(builder, drilldownTransforms.transformIn, true),
        transformOut: getTransformOut(builder, drilldownTransforms.transformOut, true),
      } satisfies LensTransforms),
    getSchema: (getDrilldownsSchema) => {
      return builder.isEnabled ? getLensPanelSchema(getDrilldownsSchema) : undefined;
    },
    throwOnUnmappedPanel: (config: LensSerializedAPIConfig) => {
      if (isByRefLensConfig(config)) return;

      const chartType = builder.getType(config.attributes);

      if (builder.isEnabled && !builder.isSupported(chartType)) {
        throw new Error(`Lens "${chartType}" chart type is not supported`);
      }
    },
  });
}
