/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FleetServerLib } from '../types';
import { TokenLib } from '../token';
import { AgentLib } from '../agent';
import { FrameworkLib } from '../framework';
import { AgentAdapter } from '../adapters/agent/default';
import { SODatabaseAdapter } from '../adapters/saved_objets_database/default';
import { TokenAdapter } from '../adapters/tokens/default';
import { FrameworkAdapter } from '../adapters/framework/default';

export function compose(server: any): FleetServerLib {
  const soDatabaseAdapter = new SODatabaseAdapter(
    server.savedObjects,
    server.plugins.elasticsearch
  );
  const agentAdapter = new AgentAdapter(soDatabaseAdapter);
  const tokenAdapter = new TokenAdapter(soDatabaseAdapter);
  const frameworkAdapter = new FrameworkAdapter(server);

  const framework = new FrameworkLib(frameworkAdapter);

  const tokens = new TokenLib(tokenAdapter, framework);
  const agents = new AgentLib(agentAdapter, tokens);

  return {
    agents,
    tokens,
  };
}
