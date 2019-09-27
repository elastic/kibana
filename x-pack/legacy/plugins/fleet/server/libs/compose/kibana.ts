/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import os from 'os';
import { TokenLib } from '../token';
import { AgentLib } from '../agent';
import { FrameworkLib } from '../framework';
import { AgentsRepository } from '../../repositories/agents/default';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/default';
import { TokensRepository } from '../../repositories/tokens/default';
import { FrameworkAdapter } from '../../adapters/framework/default';
import { PolicyLib } from '../policy';
import { EncryptedSavedObjects } from '../../adapters/encrypted_saved_objects/default';
import { FleetServerLib } from '../types';
import { PoliciesRepository } from '../../repositories/policies/default';
import { ArtifactLib } from '../artifact';
import { FileSystemArtifactRepository } from '../../repositories/artifacts/file_system';
import { HttpAdapter } from '../../adapters/http_adapter/default';

export function compose(server: any): FleetServerLib {
  const frameworkAdapter = new FrameworkAdapter(server);
  const policyAdapter = new PoliciesRepository(server.plugins.ingest.policy);

  const framework = new FrameworkLib(frameworkAdapter);
  const soDatabaseAdapter = new SODatabaseAdapter(
    server.savedObjects,
    server.plugins.elasticsearch
  );
  const encryptedObjectAdapter = new EncryptedSavedObjects(server.plugins.encrypted_saved_objects);
  const agentRepository = new AgentsRepository(soDatabaseAdapter);
  const tokenRepository = new TokensRepository(soDatabaseAdapter, encryptedObjectAdapter);

  const policies = new PolicyLib(policyAdapter);
  const tokens = new TokenLib(tokenRepository, framework);
  const agents = new AgentLib(agentRepository, tokens, policies);

  const artifactRepository = new FileSystemArtifactRepository(os.tmpdir());
  const artifacts = new ArtifactLib(artifactRepository, new HttpAdapter());

  return {
    agents,
    tokens,
    policies,
    artifacts,
  };
}
