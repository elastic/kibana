/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalsTaskProvider } from '../types';
import { createInferenceTaskProvider } from './inference';
import { createAgentBuilderConverseTaskProvider } from './agent_builder_converse';
import { createAgentBuilderToolTaskProvider } from './agent_builder_tool';

/** Instantiates the providers that ship with the evals plugin. */
export const createBuiltInTaskProviders = (): EvalsTaskProvider[] => [
  createInferenceTaskProvider(),
  createAgentBuilderConverseTaskProvider(),
  createAgentBuilderToolTaskProvider(),
];

export {
  createInferenceTaskProvider,
  createAgentBuilderConverseTaskProvider,
  createAgentBuilderToolTaskProvider,
};
