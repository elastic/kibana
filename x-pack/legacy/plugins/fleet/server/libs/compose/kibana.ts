/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TokenLib } from '../token';
import { AgentLib } from '../agent';
import { FrameworkLib } from '../framework';
import { AgentAdapter } from '../adapters/agent/default';
import { SODatabaseAdapter } from '../adapters/saved_objets_database/default';
import { TokenAdapter } from '../adapters/tokens/default';
import { FrameworkAdapter } from '../adapters/framework/default';
import { PolicyLib } from '../policy';
import { EncryptedSavedObjects } from '../adapters/encrypted_saved_objects/default';
import { FleetServerLib } from '../types';
import { PolicyAdapter } from '../adapters/policy/default';

export function compose(server: any): FleetServerLib {
  const frameworkAdapter = new FrameworkAdapter(server);
  const policyAdapter = new PolicyAdapter(server.plugins.ingest.policy);

  const framework = new FrameworkLib(frameworkAdapter);
  const soDatabaseAdapter = new SODatabaseAdapter(
    server.savedObjects,
    server.plugins.elasticsearch
  );
  const encryptedObjectAdapter = new EncryptedSavedObjects(server.plugins.encrypted_saved_objects);
  const agentAdapter = new AgentAdapter(soDatabaseAdapter);
  const tokenAdapter = new TokenAdapter(soDatabaseAdapter, encryptedObjectAdapter);

  const policies = new PolicyLib(policyAdapter);
  const tokens = new TokenLib(tokenAdapter, framework);
  const agents = new AgentLib(agentAdapter, tokens, policies);

  return {
    agents,
    tokens,
    policies,
  };
}
