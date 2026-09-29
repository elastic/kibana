/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CONNECTOR_DESCRIPTION_MAX_LENGTH } from '../../../../common';
import { rawConnectorSchema as rawConnectorSchemaV4 } from './v4';

export const rawConnectorSchema = rawConnectorSchemaV4.extends({
  // User-provided free text. Not encrypted and not part of AAD, so it can be edited on its own.
  description: schema.maybe(schema.string({ maxLength: CONNECTOR_DESCRIPTION_MAX_LENGTH })),
});
