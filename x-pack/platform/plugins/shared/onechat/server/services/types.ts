/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ElasticsearchServiceStart } from '@kbn/core-elasticsearch-server';
import type { SecurityServiceStart } from '@kbn/core-security-server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import type { ToolsServiceSetup, ToolsServiceStart } from './tools';
import type { RunnerFactory } from './runner';
import { EsqlToolClientService } from './tools/esql/esql_tool_service';

export interface InternalSetupServices {
  tools: ToolsServiceSetup;
}

export interface InternalStartServices {
  tools: ToolsServiceStart;
  runnerFactory: RunnerFactory; 
  esql: EsqlToolClientService;
}

export interface ServicesStartDeps {
  // core services
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  // plugin deps
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
}
