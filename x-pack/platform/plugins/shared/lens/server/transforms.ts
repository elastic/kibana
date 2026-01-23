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
import { lensItemDataSchemaV2 } from './content_management';
import { LENS_EMBEDDABLE_TYPE } from '../common/constants';
import { getTransformIn } from '../common/transforms/transform_in';
import { getTransformOut } from '../common/transforms/transform_out';

export function registerLensEmbeddableTransforms(
  embeddableSetup: EmbeddableSetup,
  builder: LensConfigBuilder
) {
  embeddableSetup.registerTransforms(LENS_EMBEDDABLE_TYPE, {
    getTransforms: (drilldownTransforms: DrilldownTransforms) => ({
      transformIn: getTransformIn(builder, drilldownTransforms.transformIn),
      transformOut: getTransformOut(builder, drilldownTransforms.transformOut),
    }),
    getSchema: () => {
      return builder.isEnabled ? lensPanelSchema : undefined;
    },
    throwOnUnmappedPanel: (state: LensSerializedAPIConfig) => {
      const chartType = builder.getType(state.attributes);

      if (builder.isEnabled && !builder.isSupported(chartType)) {
        throw new Error(`Lens "${chartType}" chart type is not supported`);
      }
    },
  });
}

const legacyPanelAttributesSchema = lensItemDataSchemaV2.extends({
  type: schema.maybe(schema.literal('lens')), // why is this added to the panel state?
});

const lensByValuePanelSchema = schema.object(
  {
    // TODO: add missing config properties
    attributes: schema.oneOf([lensApiStateSchema, legacyPanelAttributesSchema]),
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
