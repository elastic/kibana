/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExternalSourceConnectorServiceContract } from './external_source_connector_service';

export type ExternalSourceConnectorServiceMock =
  jest.Mocked<ExternalSourceConnectorServiceContract>;

export const createExternalSourceConnectorServiceMock = (): ExternalSourceConnectorServiceMock => ({
  create: jest.fn().mockResolvedValue('connector-1'),
  delete: jest.fn().mockResolvedValue(undefined),
});
