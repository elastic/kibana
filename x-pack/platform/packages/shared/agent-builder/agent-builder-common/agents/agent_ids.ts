/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasNamespaceName, isInProtectedNamespace } from '../base/namespaces';
import { SELF_AGENT_ID } from './constants';
import type { ConversationStarter } from './definition';

// - Must start and end with letter or digit
// - Can contain letters, digits, hyphens, underscores and dots
export const agentIdRegexp =
  /^(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?))*$/;

export const agentIdMaxLength = 64;
export const AGENT_NAME_MAX_LENGTH = 256;
export const AGENT_DESCRIPTION_MAX_LENGTH = 2000;
export const MAX_CONVERSATION_STARTERS = 3;
export const CONVERSATION_STARTER_LABEL_MAX_LENGTH = 30;

export const validateAgentId = ({
  agentId,
  builtIn,
}: {
  agentId: string;
  builtIn: boolean;
}): string | undefined => {
  if (agentId === SELF_AGENT_ID) {
    return `Agent id "${SELF_AGENT_ID}" is reserved and cannot be used.`;
  }
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

/**
 * Checks the conversation starters of an agent defined in code, with the same limits the agents API
 * applies. Returns the reason they are invalid, or undefined when they are fine.
 */
export const validateConversationStarters = (
  starters: readonly ConversationStarter[] | undefined
): string | undefined => {
  if (!starters) {
    return undefined;
  }
  if (starters.length > MAX_CONVERSATION_STARTERS) {
    return `Agents are limited to ${MAX_CONVERSATION_STARTERS} conversation starters.`;
  }
  for (const [index, { label }] of starters.entries()) {
    const position = index + 1;
    if (label.trim().length === 0) {
      return `The label of conversation starter ${position} must not be blank.`;
    }
    if (label.length > CONVERSATION_STARTER_LABEL_MAX_LENGTH) {
      return `The label of conversation starter ${position} is limited to ${CONVERSATION_STARTER_LABEL_MAX_LENGTH} characters.`;
    }
  }
  return undefined;
};
