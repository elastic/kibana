/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInternalError } from '../base/errors';

/**
 * Represents a plain toolId, without source information attached to it.
 */
export type PlainIdToolIdentifier = string;
export type ToolProviderId = string;

/**
 * Structured representation of a tool identifier.
 */
export interface StructuredToolIdentifier {
  /** The unique ID of this tool, relative to the source **/
  toolId: string;
  /** The type of source the tool is being provided from, e.g. builtIn or MCP **/
  providerId: string;
}

export const serializedPartsSeparator = '::';

/**
 * The singleton providerId used for all builtIn tools.
 */
export const builtinToolProviderId = 'built_in';
/**
 * The singleton providerId used for all Esql tools.
 */
export const esqlToolProviderId = 'esql';
/**
 * Unknown sourceId used from converting plain Ids to structured or serialized ids.
 */
export const unknownToolProviderId = 'unknown';

/**
 * Build a structured tool identifier for given builtin tool ID.
 */
export const createBuiltinToolId = (plainId: PlainIdToolIdentifier): StructuredToolIdentifier => {
  return {
    toolId: plainId,
    providerId: builtinToolProviderId,
  };
};

/**
 * String representation of {@link StructuredToolIdentifier}
 * Follow a `{toolId}||{sourceType}||{sourceId}` format.
 */
export type SerializedToolIdentifier = `${ToolProviderId}::${PlainIdToolIdentifier}`;

/**
 * Defines all possible shapes for a tool identifier.
 */
export type ToolIdentifier =
  | PlainIdToolIdentifier
  | StructuredToolIdentifier
  | SerializedToolIdentifier;

/**
 * Check if the given {@link ToolIdentifier} is a {@link SerializedToolIdentifier}
 */
export const isSerializedToolIdentifier = (
  identifier: ToolIdentifier
): identifier is SerializedToolIdentifier => {
  return typeof identifier === 'string' && identifier.split(serializedPartsSeparator).length === 2;
};

/**
 * Check if the given {@link ToolIdentifier} is a {@link StructuredToolIdentifier}
 */
export const isStructuredToolIdentifier = (
  identifier: ToolIdentifier
): identifier is StructuredToolIdentifier => {
  return typeof identifier === 'object' && 'toolId' in identifier && 'providerId' in identifier;
};

/**
 * Check if the given {@link ToolIdentifier} is a {@link PlainIdToolIdentifier}
 */
export const isPlainToolIdentifier = (
  identifier: ToolIdentifier
): identifier is PlainIdToolIdentifier => {
  return typeof identifier === 'string' && identifier.split(serializedPartsSeparator).length === 1;
};

/**
 * Convert the given {@link ToolIdentifier} to a {@link SerializedToolIdentifier}
 */
export const toSerializedToolIdentifier = (
  identifier: ToolIdentifier
): SerializedToolIdentifier => {
  if (isSerializedToolIdentifier(identifier)) {
    return identifier;
  }
  if (isStructuredToolIdentifier(identifier)) {
    return `${identifier.providerId}::${identifier.toolId}`;
  }
  if (isPlainToolIdentifier(identifier)) {
    return `${unknownToolProviderId}::${identifier}`;
  }

  throw createInternalError(`Malformed tool identifier: "${identifier}"`);
};

/**
 * Convert the given {@link ToolIdentifier} to a {@link StructuredToolIdentifier}
 */
export const toStructuredToolIdentifier = (
  identifier: ToolIdentifier
): StructuredToolIdentifier => {
  if (isStructuredToolIdentifier(identifier)) {
    return identifier;
  }
  if (isSerializedToolIdentifier(identifier)) {
    const [providerId, toolId] = identifier.split(serializedPartsSeparator);
    return {
      toolId,
      providerId,
    };
  }
  if (isPlainToolIdentifier(identifier)) {
    return {
      toolId: identifier,
      providerId: unknownToolProviderId,
    };
  }

  throw createInternalError(`Malformed tool identifier: "${identifier}"`);
};

/**
 * Serializable representation of a tool, without its handler or schema.
 *
 * Use as a common base for browser-side and server-side tool types.
 */
export interface ToolDescriptor {
  /**
   * A unique id for this tool.
   */
  id: PlainIdToolIdentifier;
  /**
   * The description for this tool, which will be exposed to the LLM.
   */
  description: string;
  /**
   * Meta associated with this tool
   */
  meta: ToolDescriptorMeta;
}

/**
 * Metadata associated with a tool.
 *
 * Some of them are specified by the tool owner during registration,
 * others are automatically added by the framework.
 */
export interface ToolDescriptorMeta {
  /**
   * ID of the provider this tool is exposed from.
   */
  providerId: ToolProviderId;
  /**
   * Optional list of tags attached to this tool.
   * For built-in tools, this is specified during registration.
   */
  tags: string[];
}

export const toolDescriptorToIdentifier = (tool: ToolDescriptor): StructuredToolIdentifier => {
  return {
    toolId: tool.id,
    providerId: tool.meta.providerId,
  };
};
