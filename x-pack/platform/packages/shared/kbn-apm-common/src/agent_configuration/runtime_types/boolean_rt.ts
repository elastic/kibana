/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';

export const booleanRt = t.union([t.literal('true'), t.literal('false')]);

// zod equivalent, additive (io-ts -> zod migration, elastic/kibana#243355).
export const booleanSchema = z.union([z.literal('true'), z.literal('false')]);
