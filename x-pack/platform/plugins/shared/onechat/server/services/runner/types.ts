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
import type { ScopedRunner, Runner } from '@kbn/onechat-server';
import type { ToolsServiceStart } from '../tools';
import type { AgentsServiceStart } from '../agents';
import type { CreateScopedRunnerDeps } from './runner';

export interface RunnerFactoryDeps {
  // core services
  logger: Logger;
  elasticsearch: ElasticsearchServiceStart;
  security: SecurityServiceStart;
  // plugin deps
  inference: InferenceServerStart;
  actions: ActionsPluginStart;
  // internal service deps
  toolsService: ToolsServiceStart;
  agentsService: AgentsServiceStart;
}

export type CreateScopedRunnerExtraParams = Pick<
  CreateScopedRunnerDeps,
  'request' | 'defaultConnectorId'
>;

export interface RunnerFactory {
  getRunner(): Runner;
  createScopedRunner(params: CreateScopedRunnerExtraParams): ScopedRunner;
}
