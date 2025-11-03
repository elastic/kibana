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
  logger.info('=== Starting CatchUp Agent Registration ===');

  try {
    if (!agentsSetup) {
      logger.error('agentsSetup is undefined or null!');
      return;
    }

    if (!agentsSetup.register) {
      logger.error('agentsSetup.register is undefined!');
      return;
    }

    logger.debug('agentsSetup is valid, creating agent definition...');
    const agentDefinition = catchupAgentDefinition();

    logger.info(`Agent definition created: id=${agentDefinition.id}, name=${agentDefinition.name}`);
    logger.debug(`Agent configuration: ${JSON.stringify(agentDefinition.configuration, null, 2)}`);

    logger.info('Calling agentsSetup.register()...');
    agentsSetup.register(agentDefinition);

    logger.info('=== CatchUp Agent Registration SUCCESS ===');
    logger.info(`Agent "${agentDefinition.name}" (${agentDefinition.id}) registered successfully`);
  } catch (error) {
    logger.error('=== CatchUp Agent Registration FAILED ===');
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error registering agent: ${errorMessage}`);
    if (error instanceof Error && error.stack) {
      logger.debug(`Agent registration error stack: ${error.stack}`);
    }
    throw error;
  }
}
