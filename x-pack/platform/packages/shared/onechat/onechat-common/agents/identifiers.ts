/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInternalError } from '../base/errors';

export type AgentIdentifier =
  | PlainIdAgentIdentifier
  | StructuredAgentIdentifier
  | SerializedAgentIdentifier;

export type PlainIdAgentIdentifier = string;
export type AgentProviderId = string;

/**
 * Structured representation of an agent identifier.
 */
export interface StructuredAgentIdentifier {
  /** The unique ID of this agent, within its provider **/
  agentId: string;
  /** Unique ID of the provider this agent is coming from */
  providerId: string;
}

/**
 * String representation of {@link StructuredAgentIdentifier}
 * Follow a `{providerId}:{agentId}` format.
 */
export type SerializedAgentIdentifier = `${AgentProviderId}::${PlainIdAgentIdentifier}`;

export const serializedPartsSeparator = '::';
export const unknownAgentProviderId = 'unknown';

/**
 * Check if the given {@link AgentIdentifier} is a {@link SerializedAgentIdentifier}
 */
export const isSerializedAgentIdentifier = (
  identifier: AgentIdentifier
): identifier is SerializedAgentIdentifier => {
  return typeof identifier === 'string' && identifier.split(serializedPartsSeparator).length === 2;
};

/**
 * Check if the given {@link AgentIdentifier} is a {@link StructuredAgentIdentifier}
 */
export const isStructuredAgentIdentifier = (
  identifier: AgentIdentifier
): identifier is StructuredAgentIdentifier => {
  return typeof identifier === 'object' && 'agentId' in identifier && 'providerId' in identifier;
};

/**
 * Check if the given {@link AgentIdentifier} is a {@link PlainIdAgentIdentifier}
 */
export const isPlainAgentIdentifier = (
  identifier: AgentIdentifier
): identifier is PlainIdAgentIdentifier => {
  return typeof identifier === 'string' && identifier.split(serializedPartsSeparator).length === 1;
};

/**
 * Convert the given {@link ToolIdentifier} to a {@link SerializedToolIdentifier}
 */
export const toSerializedAgentIdentifier = (
  identifier: AgentIdentifier
): SerializedAgentIdentifier => {
  if (isSerializedAgentIdentifier(identifier)) {
    return identifier;
  }
  if (isStructuredAgentIdentifier(identifier)) {
    return `${identifier.providerId}::${identifier.agentId}`;
  }
  if (isPlainAgentIdentifier(identifier)) {
    return `${unknownAgentProviderId}::${identifier}`;
  }

  throw createInternalError(`Malformed agent identifier: "${identifier}"`);
};

/**
 * Convert the given {@link ToolIdentifier} to a {@link StructuredToolIdentifier}
 */
export const toStructuredAgentIdentifier = (
  identifier: AgentIdentifier
): StructuredAgentIdentifier => {
  if (isStructuredAgentIdentifier(identifier)) {
    return identifier;
  }
  if (isSerializedAgentIdentifier(identifier)) {
    const [providerId, agentId] = identifier.split(serializedPartsSeparator);
    return {
      agentId,
      providerId,
    };
  }
  if (isPlainAgentIdentifier(identifier)) {
    return {
      agentId: identifier,
      providerId: unknownAgentProviderId,
    };
  }

  throw createInternalError(`Malformed agent identifier: "${identifier}"`);
};
