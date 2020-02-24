/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */
import { rule_id, status_code, message } from './schemas';
/* eslint-enable @typescript-eslint/camelcase */

export const errorSchema = t.exact(
  t.type({
    rule_id,
    error: t.type({
      status_code,
      message,
    }),
  })
);
export type ErrorSchema = t.TypeOf<typeof errorSchema>;
