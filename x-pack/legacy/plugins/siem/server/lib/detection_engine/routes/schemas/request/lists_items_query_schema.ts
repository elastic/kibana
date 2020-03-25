/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { list_id, ip } from '../common/schemas';

// TODO: Type dependents where if list_id is there then at least one of the following must be there
// either ip, string, number, etc... For now we are doing partials

export const listsItemsQuerySchema = t.intersection([
  t.type({
    list_id,
  }),
  t.exact(t.partial({ ip /* TODO: Other data types such as date, string, etc... */ })),
]);

export type ListsItemsQuerySchema = t.TypeOf<typeof listsItemsQuerySchema>;
