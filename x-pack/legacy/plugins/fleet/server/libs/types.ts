/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentLib } from './agent';
import { ApiKeyLib } from './api_keys';
import { PolicyLib } from './policy';
import { ArtifactLib } from './artifact';
import { InstallLib } from './install';
import { FrameworkLib } from './framework';

export interface FleetServerLib {
  apiKeys: ApiKeyLib;
  agents: AgentLib;
  policies: PolicyLib;
  artifacts: ArtifactLib;
  install: InstallLib;
  framework: FrameworkLib;
}
