/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FIELD_ORIGIN } from '../../../../../../common/constants';

export const styleFieldSchema = schema.object({
  name: schema.string(),
  origin: schema.oneOf([schema.literal(FIELD_ORIGIN.SOURCE), schema.literal(FIELD_ORIGIN.JOIN)]),
});
