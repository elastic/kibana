/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omitBy } from 'lodash';
import { isDefined } from '@kbn/ml-is-defined';
import { ML_INTERNAL_BASE_PATH } from '../../../../common/constants/app';
import { type SupportedPath } from '../../../../common/api_schemas/json_schema_schema';
import type { HttpService } from '../http_service';

export interface GetSchemaDefinitionParams {
  path: SupportedPath;
  method: string;
}

export function jsonSchemaProvider(httpService: HttpService) {
  return {
    getSchemaDefinition(params: GetSchemaDefinitionParams) {
      return httpService.http<object>({
        path: `${ML_INTERNAL_BASE_PATH}/json_schema`,
        method: 'GET',
        query: omitBy(params, (v) => !isDefined(v)),
        version: '1',
      });
    },
  };
}
