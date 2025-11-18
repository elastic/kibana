/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition, AgentConfiguration } from '@kbn/agent-builder-common';

/** Same type for now */
export type BuiltInAgentConfiguration = AgentConfiguration;

/**
 * Represents a built-in agent definition, as registered by the consumers using the agents setup contract.
 */
export type BuiltInAgentDefinition = Pick<
  AgentDefinition,
  'id' | 'name' | 'description' | 'labels' | 'avatar_icon' | 'avatar_symbol' | 'avatar_color'
> & {
  configuration: BuiltInAgentConfiguration;
};
