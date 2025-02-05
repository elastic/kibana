/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createUseFieldsMetadataHookMock } from './hooks/use_fields_metadata/use_fields_metadata.mock';
import { createFieldsMetadataServiceStartMock } from './services/fields_metadata/fields_metadata_service.mock';

const createFieldsMetadataPublicStartMock = () => ({
  getClient: createFieldsMetadataServiceStartMock().getClient,
  useFieldsMetadata: createUseFieldsMetadataHookMock(),
});

export const fieldsMetadataPluginPublicMock = {
  createStartContract: createFieldsMetadataPublicStartMock,
};
