/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { DateFromISOString } from 'io-ts-types/lib/DateFromISOString';

export const User = t.type({
  userId: t.number,
  name: t.string,
});

export const createRulesSchema = t.type({
  created_at: DateFromISOString,
  updated_at: DateFromISOString,
  created_by: t.string,
});

export type CreateRulesSchema = t.TypeOf<typeof createRulesSchema>;
