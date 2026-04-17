/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod/v4';
import type { StaticToolRegistration } from './builtin';

/**
 * Minimal subset of the agentBuilder plugin's setup contract `tools` namespace.
 * Exported so that plugins wishing to register built-in tools at setup time can
 * type-check against this interface without taking a direct dependency on the
 * agentBuilder plugin itself (which would create a circular dependency).
 */
export interface AgentBuilderToolsSetup {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- any is used by the original type
  register: <RunInput extends ZodObject<any>>(tool: StaticToolRegistration<RunInput>) => void;
}
