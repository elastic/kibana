/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { DeepStrict } from '@kbn/zod-helpers';

type Is<TLeft, TRight extends TLeft> = (value: TLeft) => value is TRight;
type As<TLeft, TRight extends TLeft> = (value: TRight) => TRight;
type Asserts<TLeft, TRight extends TLeft> = (value: TLeft) => asserts value is TRight;
type Parse<TLeft, TRight extends TLeft> = (value: TLeft) => TRight;

function createIs<TLeft, TRight extends TLeft>(
  _base: z.Schema<TLeft>,
  narrow: z.Schema<TRight>
): Is<TLeft, TRight> {
  return (value: TLeft): value is TRight => {
    return narrow.safeParse(value).success;
  };
}

function createAs<TLeft, TRight extends TLeft>(
  _base: z.Schema<TLeft>,
  _narrow: z.Schema<TRight>
): As<TLeft, TRight> {
  return (value: TRight): TRight => {
    return value;
  };
}

function createAsserts<TLeft, TRight extends TLeft>(
  _base: z.Schema<TLeft>,
  narrow: z.Schema<TRight>
): Asserts<TLeft, TRight> {
  return (value: TLeft) => {
    narrow.parse(value);
    return true;
  };
}

function createParse<TLeft, TRight extends TLeft>(
  _base: z.Schema<TLeft>,
  narrow: z.Schema<TRight>
): Parse<TLeft, TRight> {
  return (value: TLeft): TRight => {
    return narrow.parse(value);
  };
}

export interface Validation<TLeft = any, TRight extends TLeft = any> {
  is: Is<TLeft, TRight>;
  as: As<TLeft, TRight>;
  asserts: Asserts<TLeft, TRight>;
  parse: Parse<TLeft, TRight>;
  left: z.Schema<TLeft>;
  right: z.Schema<TRight>;
}

export function validation<TLeft, TRight extends TLeft>(
  left: z.Schema<TLeft>,
  right: z.Schema<TRight>
): Validation<TLeft, TRight> {
  const strict = DeepStrict(right);
  return {
    is: createIs(left, strict),
    as: createAs(left, strict),
    asserts: createAsserts(left, strict),
    parse: createParse(left, strict),
    left,
    right,
  };
}
