/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RunContext, RunAgentStackEntry } from './runner';

/**
 * Returns the most recent agent entry from a run context stack, if any.
 */
export const getAgentFromRunContext = (context: RunContext): RunAgentStackEntry | undefined => {
  return [...context.stack].reverse().find((entry) => entry.type === 'agent');
};
