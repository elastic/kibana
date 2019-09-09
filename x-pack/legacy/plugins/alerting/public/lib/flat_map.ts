/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Option, map, flatten } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

type mapperToFlatten<A, B> = (val: A) => Option<B>;
export function flatMap<A, B>(fn: mapperToFlatten<A, B>) {
  return function(optional: Option<A>): Option<B> {
    return pipe(
      optional,
      map(fn),
      flatten
    );
  };
}
