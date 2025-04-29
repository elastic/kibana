/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValuesType, SetIntersection, OmitByValueExact } from 'utility-types';
import { pick } from 'lodash';

type SplitByDot<
  TPath extends string,
  TPrefix extends string = ''
> = TPath extends `${infer TKey}.${infer TRest}`
  ? [`${TPrefix}${TKey}.*`, ...SplitByDot<TRest, `${TPrefix}${TKey}.`>]
  : [`${TPrefix}${TPath}`];

type PatternMapOf<T extends Record<string, any>> = {
  [TKey in keyof T]: ValuesType<TKey extends string ? ['*', ...SplitByDot<TKey>] : never>;
};

export type PickWithPatterns<
  T extends Record<string, any>,
  TPatterns extends string[]
> = OmitByValueExact<
  {
    [TFieldName in keyof T]: SetIntersection<
      ValuesType<TPatterns>,
      PatternMapOf<T>[TFieldName]
    > extends never
      ? never
      : T[TFieldName];
  },
  never
>;

export type PatternsUnionOf<T extends Record<string, any>> = '*' | ValuesType<PatternMapOf<T>>;

export function pickWithPatterns<
  T extends Record<string, any>,
  TPatterns extends Array<PatternsUnionOf<T>>
>(map: T, ...patterns: TPatterns): PickWithPatterns<T, TPatterns> {
  const allFields = Object.keys(map);
  const matchedFields = allFields.filter((field) =>
    patterns.some((pattern) => {
      if (pattern === field) {
        return true;
      }

      const fieldParts = field.split('.');
      const patternParts = pattern.split('.');

      if (patternParts.indexOf('*') !== patternParts.length - 1) {
        return false;
      }

      return fieldParts.every((fieldPart, index) => {
        const patternPart = patternParts.length - 1 < index ? '*' : patternParts[index];

        return fieldPart === patternPart || patternPart === '*';
      });
    })
  );

  return pick(map, matchedFields) as unknown as PickWithPatterns<T, TPatterns>;
}
