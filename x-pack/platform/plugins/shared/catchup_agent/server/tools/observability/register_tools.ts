/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { ToolsSetup } from '@kbn/onechat-plugin/server';
import { observabilityUpdatesTool } from './observability_updates_tool';

export function registerObservabilityTool(toolsSetup: ToolsSetup, logger: Logger): void {
  logger.debug('Registering Observability CatchUp tool');

  toolsSetup.register(observabilityUpdatesTool());

  logger.info('Registered Observability CatchUp tool');
}
