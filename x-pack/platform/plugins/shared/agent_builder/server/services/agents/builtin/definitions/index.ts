/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BuiltinAgentRegistry } from '../registry';
import { createDefaultAgentDefinition } from './default_agent';

export const registerBuiltinAgents = ({ registry }: { registry: BuiltinAgentRegistry }) => {
  const definitions = [createDefaultAgentDefinition()];

  for (const definition of definitions) {
    registry.register(definition);
  }
};
