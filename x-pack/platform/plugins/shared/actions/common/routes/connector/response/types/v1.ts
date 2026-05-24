/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import type {
  connectorResponseSchemaV1,
  connectorTypeResponseSchemaV1,
  getAllConnectorsResponseSchemaV1,
  connectorExecuteResponseSchemaV1,
  getAllConnectorTypesResponseSchemaV1,
  connectorAuthStatusResponseSchemaV1,
} from '..';
import type { getConnectorSpecResponseBodySchema } from '../schemas/v1';

export type ConnectorResponse = TypeOf<typeof connectorResponseSchemaV1>;
export type GetAllConnectorsResponse = TypeOf<typeof getAllConnectorsResponseSchemaV1>;
export type ConnectorTypeResponse = TypeOf<typeof connectorTypeResponseSchemaV1>;
export type GetAllConnectorTypesResponse = TypeOf<typeof getAllConnectorTypesResponseSchemaV1>;
export type ConnectorExecuteResponse = TypeOf<typeof connectorExecuteResponseSchemaV1>;
export type ConnectorAuthStatusResponse = TypeOf<typeof connectorAuthStatusResponseSchemaV1>;
export type GetConnectorSpecResponse = TypeOf<typeof getConnectorSpecResponseBodySchema>;
