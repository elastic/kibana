/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { CONNECTOR_ID_MAX_LENGTH } from '../../../../..';
import { connectorResponseSchemaV1 } from '../../../response';

export const upgradeConnectorParamsSchema = schema.object({
  id: schema.string({
    minLength: 1,
    maxLength: CONNECTOR_ID_MAX_LENGTH,
    meta: { description: 'An identifier for the connector.' },
  }),
});

export const upgradeConnectorResponseSchema = schema.object({
  status: schema.oneOf([
    schema.literal('current'),
    schema.literal('upgraded'),
    schema.literal('reconfiguration_required'),
  ]),
  from_version: schema.string({
    meta: { description: 'The connector specification version before the upgrade.' },
  }),
  to_version: schema.string({
    meta: { description: 'The active connector specification version targeted by the upgrade.' },
  }),
  connector: connectorResponseSchemaV1,
});
