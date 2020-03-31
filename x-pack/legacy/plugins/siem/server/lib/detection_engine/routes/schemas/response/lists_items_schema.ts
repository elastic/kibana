/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */

import { list_id, ip, id, meta, created_at } from '../common/schemas';

export const listsItemsSchema = t.intersection([
  t.type({
    id,
    list_id,
    created_at,
    // TODO: Add all the other possible data types
  }),
  t.exact(t.partial({ meta, ip })),
]);

export type ListsItemsSchema = t.TypeOf<typeof listsItemsSchema>;
