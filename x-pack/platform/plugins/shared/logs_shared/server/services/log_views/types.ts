/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ElasticsearchClient,
  ElasticsearchServiceStart,
  KibanaRequest,
  SavedObjectsClientContract,
  SavedObjectsServiceStart,
} from '@kbn/core/server';
import { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import { LogSourcesService } from '@kbn/logs-data-access-plugin/common/types';
import { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/server';
import {
  LogView,
  LogViewAttributes,
  LogViewReference,
  LogViewsStaticConfig,
  ResolvedLogView,
} from '../../../common/log_views';

export interface LogViewsServiceStartDeps {
  dataViews: DataViewsServerPluginStart;
  logsDataAccess: LogsDataAccessPluginStart;
  elasticsearch: ElasticsearchServiceStart;
  savedObjects: SavedObjectsServiceStart;
}

export interface LogViewFallbackHandlerOptions {
  soClient: SavedObjectsClientContract;
}

export type LogViewFallbackHandler =
  | ((sourceId: string, options: LogViewFallbackHandlerOptions) => Promise<LogView>)
  | null;

export interface LogViewsServiceSetup {
  defineInternalLogView(logViewId: string, logViewAttributes: Partial<LogViewAttributes>): void;
  registerLogViewFallbackHandler: (handler: LogViewFallbackHandler) => void;
  setLogViewsStaticConfig: (config: LogViewsStaticConfig) => void;
}

export interface LogViewsServiceStart {
  getClient(
    savedObjectsClient: SavedObjectsClientContract,
    elasticsearchClient: ElasticsearchClient,
    logSourcesService: Promise<LogSourcesService>,
    request?: KibanaRequest
  ): ILogViewsClient;
  getScopedClient(request: KibanaRequest): ILogViewsClient;
}

export interface ILogViewsClient {
  getLogView(logViewId: string): Promise<LogView>;
  getInternalLogView(logViewId: string): Promise<LogView>;
  getResolvedLogView(logView: LogViewReference): Promise<ResolvedLogView>;
  putLogView(logViewId: string, logViewAttributes: Partial<LogViewAttributes>): Promise<LogView>;
  resolveLogView(logViewId: string, logViewAttributes: LogViewAttributes): Promise<ResolvedLogView>;
}
