/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */

import { name, description, list_id, meta, created_at } from '../common/schemas';

export const siemList = t.intersection([
  t.type({
    list_id,
    created_at,
  }),
  t.exact(t.partial({ meta, name, description })),
]);
export type SiemListSchema = t.TypeOf<typeof siemList>;
