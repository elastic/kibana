/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lensApiStateSchema, type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { DrilldownTransforms } from '@kbn/embeddable-plugin/common';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';

import { schema } from '@kbn/config-schema';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { isByRefLensConfig } from '../common/transforms/utils';
import { LENS_EMBEDDABLE_TYPE } from '../common/constants';
import { getTransformIn } from '../common/transforms/transform_in';
import { getTransformOut } from '../common/transforms/transform_out';

export function registerLensEmbeddableTransforms(
  embeddableSetup: EmbeddableSetup,
  builder: LensConfigBuilder
) {
  embeddableSetup.registerTransforms(LENS_EMBEDDABLE_TYPE, {
    getTransforms: (drilldownTransforms: DrilldownTransforms, legacyMode: boolean) => ({
      transformIn: getTransformIn(builder, drilldownTransforms.transformIn, legacyMode),
      transformOut: getTransformOut(builder, drilldownTransforms.transformOut, legacyMode),
    }),
    getSchema: () => {
      return lensPanelSchema;
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

const lensByValuePanelSchema = schema.object(
  {
    // TODO: add missing config properties
    attributes: lensApiStateSchema,
  },
  { unknowns: 'allow' }
);

const lensByRefPanelSchema = schema.object(
  {
    // TODO: add missing config properties
    savedObjectId: schema.string(),
  },
  { unknowns: 'allow' }
);

const lensPanelSchema = schema.oneOf([lensByValuePanelSchema, lensByRefPanelSchema]);
