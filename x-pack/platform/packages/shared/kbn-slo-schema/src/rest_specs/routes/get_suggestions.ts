/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

const getSLOSuggestionsResponseSchema = t.type({
  tags: t.array(
    t.type({
      label: t.string,
      value: t.string,
      count: t.number,
    })
  ),
});

type GetSLOSuggestionsResponse = t.OutputOf<typeof getSLOSuggestionsResponseSchema>;

export { getSLOSuggestionsResponseSchema };
export type { GetSLOSuggestionsResponse };
