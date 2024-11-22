/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { RequiredKeys } from 'utility-types';
import { isPlainObject, mergeWith, MergeWithCustomizer } from 'lodash';

type DeepOverwrite<T, U> = U extends Record<string, any>
  ? Omit<T, RequiredKeys<U>> & {
      [K in keyof U]: K extends keyof T ? DeepOverwrite<T[K], U[K]> : U[K];
    }
  : U extends undefined
  ? T
  : U;

type DeepPartialPlainObjects<T> = T extends Record<string, any>
  ? Partial<Record<string, any>> &
      Partial<{
        [TKey in keyof T]: DeepPartialPlainObjects<T[TKey]>;
      }>
  : T;

type Mergable = Record<string, any>;

type MergeRecursively<TMergables extends Mergable[]> = TMergables extends [
  infer THead,
  ...infer TTail
]
  ? TTail extends Mergable[]
    ? DeepOverwrite<THead, MergeRecursively<TTail>>
    : THead
  : TMergables extends [infer THead]
  ? THead
  : TMergables extends []
  ? {}
  : {};

const customMergeFunction: MergeWithCustomizer = (value, sourceValue) => {
  if (isPlainObject(sourceValue)) {
    return mergeWith(value, sourceValue, customMergeFunction);
  }
  return sourceValue;
};

function mergePlainObjectsOnly(...sources: Mergable[]) {
  return mergeWith({}, ...sources.concat(customMergeFunction));
}

export function mergePlainObjects<T1 extends Record<string, any> | undefined>(t1: T1): T1;

export function mergePlainObjects<T1 extends Mergable, T2 extends DeepPartialPlainObjects<T1>>(
  t1: T1,
  t2: T2
): MergeRecursively<[T1, T2]>;

export function mergePlainObjects<
  T1 extends Mergable,
  T2 extends DeepPartialPlainObjects<T1>,
  T3 extends DeepPartialPlainObjects<T2>
>(t1: T1, t2: T2, t3: T3): MergeRecursively<[T1, T2, T3]>;

export function mergePlainObjects<
  T1 extends Mergable,
  T2 extends DeepPartialPlainObjects<T1>,
  T3 extends DeepPartialPlainObjects<T2>,
  T4 extends DeepPartialPlainObjects<T3>
>(t1: T1, t2: T2, t3: T4): MergeRecursively<[T1, T2, T3, T4]>;
/**
 * Merges plain objects. It does two things over merge:
 *
 * - it expects the objects to be extensions of the type of
 * the source object, to provide type autocompletions
 * - arrays are not merged but overridden
 *
 * @param sources
 * @returns
 */
export function mergePlainObjects(...sources: Array<Record<string, any>>) {
  const merged = mergePlainObjectsOnly(...sources);

  return merged;
}
