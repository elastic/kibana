/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Registry } from '@kbn/interpreter';
import { Transform } from './transform';
import type { Transform as TransformType, TransformProps } from './transform';

class TransformRegistry extends Registry<TransformProps, TransformType> {
  wrapper(obj: TransformProps): TransformType {
    return new Transform(obj);
  }
}

export const transformRegistry = new TransformRegistry();
