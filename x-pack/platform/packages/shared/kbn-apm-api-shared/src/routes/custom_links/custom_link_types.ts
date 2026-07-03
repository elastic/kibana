/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const filterOptionsRt = t.partial({
  'service.name': t.string,
  'service.environment': t.string,
  'transaction.name': t.string,
  'transaction.type': t.string,
});

export const payloadRt = t.intersection([
  t.type({
    label: t.string,
    url: t.string,
  }),
  t.partial({
    id: t.string,
    filters: t.array(
      t.type({
        key: t.union([t.literal(''), t.keyof(filterOptionsRt.props)]),
        value: t.string,
      })
    ),
  }),
]);
