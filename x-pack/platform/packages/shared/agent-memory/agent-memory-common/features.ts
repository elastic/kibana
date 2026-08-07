/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AGENT_MEMORY_FEATURE_ID = 'agentMemory';

export const apiPrivileges = {
  readMemory: `${AGENT_MEMORY_FEATURE_ID}:read`,
  writeMemory: `${AGENT_MEMORY_FEATURE_ID}:write`,
};

export const uiPrivileges = {
  show: 'show',
  manage: 'manage',
};
