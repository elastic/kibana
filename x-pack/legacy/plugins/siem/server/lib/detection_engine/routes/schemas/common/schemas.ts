/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

export const name = t.string;
export const description = t.string;
export const list_id = t.string;
export const item = t.string;
export const ip = t.string;
export const meta = t.object;
export const created_at = t.string;
export const type = t.string;
export const file = t.object;
