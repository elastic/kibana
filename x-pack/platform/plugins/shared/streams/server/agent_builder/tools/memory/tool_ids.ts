/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const NAMESPACE = 'platform.streams.memory';

/**
 * Tool IDs for the Streams memory tools. Defined locally because these are internal tools,
 * inlined via skills — they do not need to be registered or defined in the shared agent-builder-common package.
 */
export const platformStreamsMemoryTools = {
  memorySearch: `${NAMESPACE}.search`,
  memoryRead: `${NAMESPACE}.read`,
  memoryWrite: `${NAMESPACE}.write`,
  memoryPatch: `${NAMESPACE}.patch`,
  memoryList: `${NAMESPACE}.list`,
  memoryDelete: `${NAMESPACE}.delete`,
  memoryRecentChanges: `${NAMESPACE}.recent_changes`,
} as const;
