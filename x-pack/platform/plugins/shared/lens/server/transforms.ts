/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lensApiStateSchema, type LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import type { LensSerializedAPIConfig } from '@kbn/lens-common-2';

import { schema } from '@kbn/config-schema';
import { getLensTransforms } from '../common/transforms';
import type { LensTransforms } from '../common/transforms/types';
import { lensItemDataSchema } from './content_management';

export const getLensServerTransforms = (
  builder: LensConfigBuilder,
  { transformEnhancementsIn, transformEnhancementsOut }: EmbeddableSetup
): LensTransforms => {
  return {
    ...getLensTransforms({
      builder,
      transformEnhancementsIn,
      transformEnhancementsOut,
    }),
    ...getExtraServerTransformProps(builder),
  };
};

export const legacyPanelSchema = lensItemDataSchema.extends({
  type: schema.maybe(schema.literal('lens')), // why is this added to the panel state?
});

const lensPanelSchema = schema.object(
  {
    // TODO: add missing config properties
    attributes: schema.oneOf([lensApiStateSchema, legacyPanelSchema]),
  },
  { unknowns: 'allow' }
);

function getExtraServerTransformProps(
  builder: LensConfigBuilder
): Pick<LensTransforms, 'schema' | 'throwOnUnmappedPanel'> {
  if (!builder.isEnabled) return {};

  return {
    schema: lensPanelSchema,
    throwOnUnmappedPanel: (state: LensSerializedAPIConfig) => {
      const chartType = builder.getType(state.attributes);

      if (!builder.isSupported(chartType)) {
        throw new Error(`Lens "${chartType}" chart type is not supported`);
      }
    },
  };
}
