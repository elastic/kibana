/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import { IRouter } from '@kbn/core-http-server';
import {
  FieldsMetadataPluginStartServicesAccessor,
  FieldsMetadataServerPluginSetupDeps,
} from '../types';

export interface FieldsMetadataBackendLibs {
  getStartServices: FieldsMetadataPluginStartServicesAccessor;
  logger: Logger;
  plugins: FieldsMetadataServerPluginSetupDeps;
  router: IRouter<RequestHandlerContext>;
}
