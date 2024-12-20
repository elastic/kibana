/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFieldsMetadataClientMock } from './fields_metadata_client.mock';
import { IFieldsMetadataClient } from './types';

interface FieldsMetadataServiceStartMock {
  getClient: () => Promise<jest.Mocked<IFieldsMetadataClient>>;
}

export const createFieldsMetadataServiceStartMock =
  (): jest.Mocked<FieldsMetadataServiceStartMock> => ({
    getClient: jest.fn().mockResolvedValue(createFieldsMetadataClientMock()),
  });
