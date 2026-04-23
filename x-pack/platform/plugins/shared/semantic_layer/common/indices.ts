/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Prefix for chat system indices. Matches the `.chat-*` pattern registered
 * in the Elasticsearch `kibana_system` role descriptor
 * (`KibanaOwnedReservedRoleDescriptors.java`).
 *
 * Duplicated from `@kbn/agent-builder-server` to avoid a circular dependency
 * (agent_builder depends on semantic_layer as a requiredPlugin).
 */
export const chatSystemIndexPrefix = '.chat-';

/**
 * Helper to construct chat system index names.
 */
export const chatSystemIndex = (suffix: string): string => {
  return `${chatSystemIndexPrefix}${suffix}`;
};
