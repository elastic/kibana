/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { list_id, id, ip } from '../common/schemas';

// TODO: Type Dependent check where there has to be at least ip or another field present?
export const readListsItemsSchema = t.intersection([
  t.exact(
    t.type({
      list_id, // TODO: This can be optional if they have the exact id of the list_item
    })
  ),
  t.exact(t.partial({ id, ip /* TODO: Other data types such as date, string, etc... */ })),
]);

export type ReadListsItemsSchema = t.TypeOf<typeof readListsItemsSchema>;
