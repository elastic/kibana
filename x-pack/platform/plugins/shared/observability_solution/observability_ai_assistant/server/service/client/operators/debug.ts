/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { inspect } from 'util';
import { dematerialize, materialize, OperatorFunction, tap } from 'rxjs';

export function debug<T>(prefix: string): OperatorFunction<T, T> {
  return (source$) => {
    return source$.pipe(
      materialize(),
      tap((event) => {
        // eslint-disable-next-line no-console
        console.log(prefix + ':\n' + inspect(event, { depth: 10 }));
      }),
      dematerialize()
    );
  };
}
