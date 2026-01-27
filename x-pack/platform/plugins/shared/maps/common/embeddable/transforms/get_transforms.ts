/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';
import { getTransformIn } from './get_transform_in';
import { getTransformOut } from './get_transform_out';

export function getTransforms(
  transformEnhancementsIn: EmbeddableSetup['transformEnhancementsIn'],
  transformEnhancementsOut: EmbeddableSetup['transformEnhancementsOut']
) {
  return {
    transformIn: getTransformIn(transformEnhancementsIn),
    transformOut: getTransformOut(transformEnhancementsOut),
  };
}
