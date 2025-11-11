/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { OnechatPluginSetup } from '@kbn/onechat-plugin/server';
import { catchupAgentDefinition } from './catchup_agent';

export function registerCatchupAgent(
  agentsSetup: OnechatPluginSetup['agents'],
  logger: Logger
): void {
  try {
    if (!agentsSetup) {
      logger.error('agentsSetup is undefined or null!');
      return;
    }

    if (!agentsSetup.register) {
      logger.error('agentsSetup.register is undefined!');
      return;
    }

    const agentDefinition = catchupAgentDefinition();
    agentsSetup.register(agentDefinition);
  } catch (error) {
    logger.error('=== CatchUp Agent Registration FAILED ===');
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error registering agent: ${errorMessage}`);
    throw error;
  }
}
