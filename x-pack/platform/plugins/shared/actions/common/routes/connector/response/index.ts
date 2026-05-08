/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Latest
export type {
  ConnectorResponse,
  GetAllConnectorsResponse,
  ConnectorExecuteResponse,
  ConnectorAuthStatusResponse,
} from './types/latest';

export {
  connectorResponseSchema,
  getAllConnectorsResponseSchema,
  connectorTypeResponseSchema,
  connectorExecuteResponseSchema,
  connectorAuthStatusResponseSchema,
} from './schemas/latest';

export type {
  ConnectorResponse as ConnectorResponseV1,
  GetAllConnectorsResponse as GetAllConnectorsResponseV1,
  ConnectorTypeResponse as ConnectorTypeResponseV1,
  GetAllConnectorTypesResponse as GetAllConnectorTypesResponseV1,
  ConnectorExecuteResponse as ConnectorExecuteResponseV1,
  ConnectorAuthStatusResponse as ConnectorAuthStatusResponseV1,
} from './types/v1';

export {
  connectorResponseSchema as connectorResponseSchemaV1,
  getAllConnectorsResponseSchema as getAllConnectorsResponseSchemaV1,
  connectorTypeResponseSchema as connectorTypeResponseSchemaV1,
  getAllConnectorTypesResponseSchema as getAllConnectorTypesResponseSchemaV1,
  connectorExecuteResponseSchema as connectorExecuteResponseSchemaV1,
  connectorAuthStatusResponseSchema as connectorAuthStatusResponseSchemaV1,
} from './schemas/v1';
