/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  FindFieldsMetadataRequestQuery,
  FindFieldsMetadataResponsePayload,
} from '../../../common/latest';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface FieldsMetadataServiceSetup {}

export interface FieldsMetadataServiceStart {
  getClient: () => Promise<IFieldsMetadataClient>;
}

export interface FieldsMetadataServiceStartDeps {
  http: HttpStart;
}

export interface IFieldsMetadataClient {
  find(params: FindFieldsMetadataRequestQuery): Promise<FindFieldsMetadataResponsePayload>;
}
