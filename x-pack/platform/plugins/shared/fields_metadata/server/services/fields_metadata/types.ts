/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { FieldMetadata } from '../../../common/fields_metadata/models/field_metadata';
import type { FieldsMetadataDictionary } from '../../../common/fields_metadata/models/fields_metadata_dictionary';
import type { FieldName, FieldSource } from '../../../common';
import type {
  IntegrationFieldsExtractor,
  IntegrationFieldsSearchParams,
  IntegrationListExtractor,
} from './repositories/types';

export type * from './repositories/types';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataServiceStartDeps {}

export interface FieldsMetadataServiceSetup {
  registerIntegrationFieldsExtractor: (extractor: IntegrationFieldsExtractor) => void;
  registerIntegrationListExtractor: (extractor: IntegrationListExtractor) => void;
}

export interface FieldsMetadataServiceStart {
  getClient(request: KibanaRequest): Promise<IFieldsMetadataClient>;
}

export interface GetFieldsMetadataOptions extends Partial<IntegrationFieldsSearchParams> {
  source?: FieldSource | FieldSource[];
}

export interface FindFieldsMetadataOptions extends GetFieldsMetadataOptions {
  fieldNames?: FieldName[];
}

export interface IFieldsMetadataClient {
  getByName(
    fieldName: FieldName,
    params?: GetFieldsMetadataOptions
  ): Promise<FieldMetadata | undefined>;
  find(params: FindFieldsMetadataOptions): Promise<FieldsMetadataDictionary>;
}
