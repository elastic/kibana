/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { either } from 'fp-ts/lib/Either';

const dateRt = new t.Type<string, string, unknown>(
  'DateAsString',
  t.string.is,
  (u, c) =>
    either.chain(t.string.validate(u, c), s => {
      const d = new Date(s);
      return isNaN(d.getTime()) ? t.failure(u, c) : t.success(s);
    }),
  a => a
);

export const rangeRt = t.type({
  start: dateRt,
  end: dateRt
});

export const uiFilterRt = t.type({ uiFilters: t.string });

export const debugRt = t.partial({ debug: t.boolean });

export const minimalRt = debugRt;

export const uiQueryRt = t.intersection([minimalRt, rangeRt, uiFilterRt]);

export const jsonRt = new t.Type<any, string, unknown>(
  'JSONAsString',
  t.string.is,
  (u, c) =>
    either.chain(t.string.validate(u, c), s => {
      try {
        return t.success(JSON.parse(s));
      } catch (e) {
        return t.failure(u, c);
      }
    }),
  a => a
);
