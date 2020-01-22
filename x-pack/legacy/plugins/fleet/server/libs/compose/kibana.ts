/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import os from 'os';
import KbnServer from '../../../../../../../src/legacy/server/kbn_server';
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
import { AgentPolicyLib } from '../agent_policy';
import { AgentEventLib } from '../agent_event';
import { makePolicyUpdateHandler } from '../policy_update';
import { PluginSetupContract as SecurityPlugin } from '../../../../../../plugins/security/server';
import { OutputsLib as IngestOutputLib } from '../../../../ingest/server/libs/outputs';
import { PolicyLib as IngestPolicyLib } from '../../../../ingest/server/libs/policy';

export interface FleetPluginsStart {
  security: SecurityPluginStartContract;
  ingest: {
    outputs: IngestOutputLib;
    policies: IngestPolicyLib;
  };
}

export type SecurityPluginSetupContract = Pick<SecurityPlugin, '__legacyCompat'>;
export type SecurityPluginStartContract = Pick<SecurityPlugin, 'authc'>;

export function compose(server: any): FleetServerLib {
  const newPlatform = ((server as unknown) as KbnServer).newPlatform;
  const pluginsStart: FleetPluginsStart = {
    security: newPlatform.setup.plugins.security as SecurityPluginStartContract,
    ingest: server.plugins.ingest,
  };

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
  const encryptedObjectAdapter = new EncryptedSavedObjects(
    server.newPlatform.start.plugins.encryptedSavedObjects
  );
  const agentsRepository = new AgentsRepository(soDatabaseAdapter);
  const agentEventsRepository = new AgentEventsRepository(soDatabaseAdapter);
  const enrollmentApiKeysRepository = new EnrollmentApiKeysRepository(
    soDatabaseAdapter,
    encryptedObjectAdapter
  );

  const libs: FleetServerLib = ({} as any) as FleetServerLib;
  const policies = new PolicyLib(policyAdapter);
  const apiKeys = new ApiKeyLib(enrollmentApiKeysRepository, libs, pluginsStart);
  const agentsPolicy = new AgentPolicyLib(agentsRepository, policies);
  const agentEvents = new AgentEventLib(agentEventsRepository);
  const agents = new AgentLib(agentsRepository, apiKeys, agentEvents);

  const artifactRepository = new FileSystemArtifactRepository(os.tmpdir());
  const artifacts = new ArtifactLib(artifactRepository, new HttpAdapter());

  const install = new InstallLib(framework);

  Object.assign(libs, {
    agents,
    agentsPolicy,
    agentEvents,
    apiKeys,
    policies,
    artifacts,
    install,
    framework,
  });

  const policyUpdateHandler = makePolicyUpdateHandler(libs);
  server.plugins.ingest.policy.registerPolicyUpdateHandler(policyUpdateHandler);

  return libs;
}
