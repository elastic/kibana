/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmbeddableSetup } from '@kbn/embeddable-plugin/server';

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils';
import type { LensTransforms } from './types';
import { getTransformIn } from './transform_in';
import { getTransformOut } from './transform_out';

export interface LensTransformDependencies {
  builder: LensConfigBuilder;
  transformEnhancementsIn?: EmbeddableSetup['transformEnhancementsIn'];
  transformEnhancementsOut?: EmbeddableSetup['transformEnhancementsOut'];
}

export function getLensTransforms(deps: LensTransformDependencies): LensTransforms {
  return {
    transformIn: getTransformIn(deps),
    transformOut: getTransformOut(deps),
  };
}
