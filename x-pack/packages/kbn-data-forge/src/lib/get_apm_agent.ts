/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Agent } from 'elastic-apm-node';
import { Config } from '../types';
import { logger } from './logger';

let agent: Agent;

export function startApmAgent(config: Config) {
  if (!agent && config.apm.enabled) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    agent = require('elastic-apm-node').start({
      serviceName: 'admin-console',
      serverUrl: config.apm.server,
      apiKey: config.apm.apiKey,
      secretToken: config.apm.secretToken,
      enviroment: 'production',
      instrument: false,
      logger,
    });
  }
  return agent;
}

export function getApmAgent(): Agent | undefined {
  return agent;
}
