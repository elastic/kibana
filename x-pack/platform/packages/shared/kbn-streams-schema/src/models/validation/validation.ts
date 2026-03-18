/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';
import { DeepStrict } from '@kbn/zod-helpers/v4';

export interface Validation<TLeft = any, TRight extends TLeft = any> {
  is: (value: TLeft) => value is TRight;
  as: (value: TRight) => TRight;
  asserts: (value: TLeft) => asserts value is TRight;
  parse: (value: TLeft) => TRight;
  left: z.Schema<TLeft>;
  right: z.Schema<TRight>;
}

export function validation<TLeft, TRight extends TLeft>(
  left: z.Schema<TLeft>,
  right: z.Schema<TRight>
): Validation<TLeft, TRight> {
  const strict = DeepStrict(right);

  return {
    is: (value: TLeft): value is TRight => strict.safeParse(value).success,
    as: (value: TRight): TRight => value,
    asserts: (value: TLeft) => {
      strict.parse(value);
      return true;
    },
    parse: (value: TLeft): TRight => strict.parse(value),
    left,
    right,
  };
}
