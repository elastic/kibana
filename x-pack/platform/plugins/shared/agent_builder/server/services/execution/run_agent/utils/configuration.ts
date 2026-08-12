/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentConfiguration } from '@kbn/agent-builder-common';
import type { ResolvedConfiguration } from '../types';

export const resolveConfiguration = (configuration: AgentConfiguration): ResolvedConfiguration => {
  return {
    instructions: configuration.instructions ?? '',
  };
};
