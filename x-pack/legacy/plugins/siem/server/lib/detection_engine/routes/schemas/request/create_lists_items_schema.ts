/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, list_id, meta, ip } from '../common/schemas';

// TODO: Type dependents where if list_id is there then at least one of the following must be there
// either ip, string, number, etc... For now we are doing partials

export const createListsItemsSchema = t.intersection([
  t.exact(
    t.type({
      list_id,
    })
  ),
  t.exact(t.partial({ meta, id, ip /* TODO: Other data types such as date, string, etc... */ })),
]);

export type CreateListsItemsSchema = t.TypeOf<typeof createListsItemsSchema>;
