/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawConnectorSchema as rawConnectorSchemaV4 } from './v4';

export const rawConnectorSchema = rawConnectorSchemaV4.extends({
  specVersion: schema.maybe(schema.string()),
});
