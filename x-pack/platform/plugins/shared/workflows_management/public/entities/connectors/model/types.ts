/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ConnectorTypeInfo } from '@kbn/workflows';

export interface ConnectorTypes {
  [key: string]: ConnectorTypeInfo;
}

export interface ConnectorsResponse {
  connectorTypes: ConnectorTypes;
  totalConnectors: number;
}
