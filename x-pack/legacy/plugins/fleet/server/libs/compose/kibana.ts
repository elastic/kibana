/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import os from 'os';
import { ApiKeyLib } from '../api_keys';
import { AgentLib } from '../agent';
import { FrameworkLib } from '../framework';
import { AgentsRepository } from '../../repositories/agents/default';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/default';
import { EnrollmentApiKeysRepository } from '../../repositories/enrollment_api_keys/default';
import { FrameworkAdapter } from '../../adapters/framework/default';
import { PolicyLib } from '../policy';
import { EncryptedSavedObjects } from '../../adapters/encrypted_saved_objects/default';
import { FleetServerLib } from '../types';
import { PoliciesRepository } from '../../repositories/policies/default';
import { ArtifactLib } from '../artifact';
import { FileSystemArtifactRepository } from '../../repositories/artifacts/file_system';
import { HttpAdapter } from '../../adapters/http_adapter/default';
import { AgentEventsRepository } from '../../repositories/agent_events/default';
import { InstallLib } from '../install';
import { ElasticsearchAdapter } from '../../adapters/elasticsearch/default';
import { AgentPolicyLib } from '../agent_policy';
import { AgentEventLib } from '../agent_event';
import { makePolicyUpdateHandler } from '../policy_update';

export function compose(server: any): FleetServerLib {
  const frameworkAdapter = new FrameworkAdapter(server);
  const policyAdapter = new PoliciesRepository(
    server.plugins.ingest.policy,
    server.plugins.ingest.outputs
  );

  const framework = new FrameworkLib(frameworkAdapter);
  const soDatabaseAdapter = new SODatabaseAdapter(
    server.savedObjects,
    server.plugins.elasticsearch
  );
  const esAdapter = new ElasticsearchAdapter(server.plugins.elasticsearch);
  const encryptedObjectAdapter = new EncryptedSavedObjects(
    server.newPlatform.start.plugins.encryptedSavedObjects
  );
  const agentsRepository = new AgentsRepository(soDatabaseAdapter);
  const agentEventsRepository = new AgentEventsRepository(soDatabaseAdapter);
  const enrollmentApiKeysRepository = new EnrollmentApiKeysRepository(
    soDatabaseAdapter,
    encryptedObjectAdapter
  );

  const policies = new PolicyLib(policyAdapter);
  const apiKeys = new ApiKeyLib(enrollmentApiKeysRepository, esAdapter, framework);
  const agentsPolicy = new AgentPolicyLib(agentsRepository, policies);
  const agentEvents = new AgentEventLib(agentEventsRepository);
  const agents = new AgentLib(agentsRepository, apiKeys, agentEvents);

  const artifactRepository = new FileSystemArtifactRepository(os.tmpdir());
  const artifacts = new ArtifactLib(artifactRepository, new HttpAdapter());

  const install = new InstallLib(framework);

  const libs = {
    agents,
    agentsPolicy,
    agentEvents,
    apiKeys,
    policies,
    artifacts,
    install,
    framework,
  };
  const policyUpdateHandler = makePolicyUpdateHandler(libs);
  server.plugins.ingest.policy.registerPolicyUpdateHandler(policyUpdateHandler);

  return libs;
}
