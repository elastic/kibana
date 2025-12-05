/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

export const DATA_QUALITY_URL_STATE_KEY = 'pageState';

export const qualityIssuesRT = rt.keyof({
  degraded: null,
  failed: null,
});

export const directionRT = rt.keyof({
  asc: null,
  desc: null,
});

export const sortRT = rt.strict({
  field: rt.string,
  direction: directionRT,
});

export const tableRT = rt.exact(
  rt.partial({
    page: rt.number,
    rowsPerPage: rt.number,
    sort: sortRT,
  })
);

export const timeRangeRT = rt.strict({
  from: rt.string,
  to: rt.string,
  refresh: rt.strict({
    pause: rt.boolean,
    value: rt.number,
  }),
});

export const degradedFieldRT = rt.exact(
  rt.partial({
    table: tableRT,
  })
);

export const dataStreamRT = new rt.Type<string, string, unknown>(
  'dataStreamRT',
  (input: unknown): input is string =>
    typeof input === 'string' && (input.match(/-/g) || []).length >= 2,
  (input, context) =>
    typeof input === 'string' && (input.match(/-/g) || []).length >= 2
      ? rt.success(input)
      : rt.failure(input, context),
  rt.identity
);
