/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentLib } from './agent';
import { TokenLib } from './token';
import { PolicyLib } from './policy';
import { ArtifactLib } from './artifact';

export interface FleetServerLib {
  agents: AgentLib;
  tokens: TokenLib;
  policies: PolicyLib;
  artifacts: ArtifactLib;
}
