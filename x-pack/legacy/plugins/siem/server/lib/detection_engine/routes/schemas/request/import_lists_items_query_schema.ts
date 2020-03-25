/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { list_id, type } from '../common/schemas';

// TODO: Type dependents where if list_id is there then at least one of the following must be there
// either ip, string, number, etc... For now we are doing partials

export const importListsItemsQuerySchema = t.exact(
  t.type({
    list_id,
    type,
    // TODO: Add overwrite here
  })
);

export type ImportListsItemsQuerySchema = t.TypeOf<typeof importListsItemsQuerySchema>;
