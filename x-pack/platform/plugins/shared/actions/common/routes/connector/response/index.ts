/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Latest
export type {
  ConnectorResponse,
  AllConnectorsResponse,
  ConnectorExecuteResponse,
} from './types/latest';
export {
  connectorResponseSchema,
  allConnectorsResponseSchema,
  connectorTypesResponseSchema,
  connectorExecuteResponseSchema,
} from './schemas/latest';

// v1
export type {
  ConnectorResponse as ConnectorResponseV1,
  AllConnectorsResponse as AllConnectorsResponseV1,
  ConnectorTypesResponse as ConnectorTypesResponseV1,
  ConnectorExecuteResponse as ConnectorExecuteResponseV1,
} from './types/v1';
export {
  connectorResponseSchema as connectorResponseSchemaV1,
  allConnectorsResponseSchema as connectorWithExtraFindDataSchemaV1,
  connectorTypesResponseSchema as connectorTypesResponseSchemaV1,
  connectorExecuteResponseSchema as connectorExecuteResponseSchemaV1,
} from './schemas/v1';
