/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentTriggerHook } from './types';

/**
 * Single-user trigger hook: always triggers agent execution.
 * Preserves the current behavior for single-user conversations.
 */
export const singleUserTriggerHook: AgentTriggerHook = async () => {
  return { invoke: true };
};
