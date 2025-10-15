/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasNamespaceName, isInProtectedNamespace } from '../base/namespaces';

// - Must start and end with letter or digit
// - Can contain letters, digits, hyphens, underscores and dots
export const agentIdRegexp =
  /^(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?))*$/;

export const agentIdMaxLength = 64;

export const validateAgentId = ({
  agentId,
  builtIn,
}: {
  agentId: string;
  builtIn: boolean;
}): string | undefined => {
  if (!agentIdRegexp.test(agentId)) {
    return `Agent ids must start and end with a letter or number, and can only contain lowercase letters, numbers, dots, hyphens and underscores`;
  }
  if (agentId.length > agentIdMaxLength) {
    return `Agent ids are limited to ${agentIdMaxLength} characters.`;
  }
  if (hasNamespaceName(agentId)) {
    return `Agent id cannot have the same name as a reserved namespace.`;
  }
  if (!builtIn) {
    if (isInProtectedNamespace(agentId)) {
      return `Agent id is using a protected namespace.`;
    }
  }
};
