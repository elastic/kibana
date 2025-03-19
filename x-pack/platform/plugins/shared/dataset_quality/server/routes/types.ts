/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ElasticsearchCapabilities } from '@kbn/core-elasticsearch-server';
import { KibanaRequest, Logger } from '@kbn/core/server';
import { DatasetQualityServerRouteRepository } from '.';
import {
  DatasetQualityPluginSetupDependencies,
  DatasetQualityPluginStartDependencies,
  DatasetQualityRequestHandlerContext,
} from '../types';

export type { DatasetQualityServerRouteRepository };

export interface DatasetQualityRouteHandlerResources {
  context: DatasetQualityRequestHandlerContext;
  logger: Logger;
  request: KibanaRequest;
  plugins: {
    [key in keyof DatasetQualityPluginSetupDependencies]: {
      setup: Required<DatasetQualityPluginSetupDependencies>[key];
      start: () => Promise<Required<DatasetQualityPluginStartDependencies>[key]>;
    };
  };
  getEsCapabilities: () => Promise<ElasticsearchCapabilities>;
}

export interface DatasetQualityRouteCreateOptions {
  tags: string[];
}
