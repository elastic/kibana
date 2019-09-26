/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Agent names can be any string. This list only defines the official agents
 * that we might want to target specifically eg. linking to their documentation
 * & telemetry reporting. Support additional agent types by appending
 * definitions in mappings.json (for telemetry), the AgentName type, and the
 * agentNames object.
 */
import { AgentName } from '../typings/es_schemas/ui/fields/Agent';

const agentNames: { [agentName in AgentName]: agentName } = {
  python: 'python',
  java: 'java',
  nodejs: 'nodejs',
  'js-base': 'js-base',
  'rum-js': 'rum-js',
  dotnet: 'dotnet',
  ruby: 'ruby',
  go: 'go'
};

export function isAgentName(agentName: string): boolean {
  return Object.values(agentNames).includes(agentName as AgentName);
}

export function isRumAgentName(agentName: string | undefined) {
  if (!agentName) {
    return false;
  }

  return ([agentNames['js-base'], agentNames['rum-js']] as string[]).includes(
    agentName
  );
}
