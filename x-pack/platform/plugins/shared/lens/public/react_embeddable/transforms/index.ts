/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder';

import type { LensTransforms } from '../../../server/transforms/types';
import { getTransformOut } from './transform_out';
import { getTransformIn } from './transform_in';

export function getLensPublicTransforms(builder: LensConfigBuilder): LensTransforms {
  return {
    transformIn: getTransformIn(builder),
    transformOut: getTransformOut(builder),
  };
}
