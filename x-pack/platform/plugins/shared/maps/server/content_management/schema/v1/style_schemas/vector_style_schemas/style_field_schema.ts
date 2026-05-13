/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { FIELD_ORIGIN } from '../../../../../../common/constants';

export const styleFieldSchema = z.object({
  name: z.string(),
  origin: z.union([z.literal(FIELD_ORIGIN.SOURCE), z.literal(FIELD_ORIGIN.JOIN)]),
});
