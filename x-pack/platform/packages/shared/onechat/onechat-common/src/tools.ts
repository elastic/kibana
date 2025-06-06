/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createInternalError } from './errors';

/**
 * Represents a plain toolId, without source information attached to it.
 */
export type PlainIdToolIdentifier = string;

/**
 * Represents the source type for a tool.
 */
export enum ToolSourceType {
  /**
   * Source used for built-in tools
   */
  builtIn = 'builtIn',
  /**
   * Source used for built-in tools
   */
  esql = 'esql',
  /**
   * Unknown source - used when converting plain ids to structured or serialized format.
   */
  unknown = 'unknown',
}

/**
 * Structured representation of a tool identifier.
 */
export interface StructuredToolIdentifier {
  /** The unique ID of this tool, relative to the source **/
  toolId: string;
  /** The type of source the tool is being provided from, e.g. builtIn or MCP **/
  sourceType: ToolSourceType;
  /** Id of the source, e.g. for MCP server it will be the server/connector ID */
  sourceId: string;
}

export const serializedPartsSeparator = '||';

/**
 * The singleton sourceId used for all builtIn tools.
 */
export const builtinSourceId = 'builtIn';
/**
 * Unknown sourceId used from converting plain Ids to structured or serialized ids.
 */
export const unknownSourceId = 'unknown';

/**
 * Build a structured tool identifier for given builtin tool ID.
 */
export const createBuiltinToolId = (plainId: PlainIdToolIdentifier): StructuredToolIdentifier => {
  return {
    toolId: plainId,
    sourceType: ToolSourceType.builtIn,
    sourceId: builtinSourceId,
  };
};

/**
 * String representation of {@link StructuredToolIdentifier}
 * Follow a `{toolId}||{sourceType}||{sourceId}` format.
 */
export type SerializedToolIdentifier = `${PlainIdToolIdentifier}||${ToolSourceType}||${string}`;

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
  return typeof identifier === 'string' && identifier.split(serializedPartsSeparator).length === 3;
};

/**
 * Check if the given {@link ToolIdentifier} is a {@link StructuredToolIdentifier}
 */
export const isStructuredToolIdentifier = (
  identifier: ToolIdentifier
): identifier is StructuredToolIdentifier => {
  return typeof identifier === 'object' && 'toolId' in identifier && 'sourceType' in identifier;
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
    return `${identifier.toolId}||${identifier.sourceType}||${identifier.sourceId}`;
  }
  if (isPlainToolIdentifier(identifier)) {
    return `${identifier}||${ToolSourceType.unknown}||${unknownSourceId}`;
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
    const [toolId, sourceType, sourceId] = identifier.split(serializedPartsSeparator);
    return {
      toolId,
      sourceType: sourceType as ToolSourceType,
      sourceId,
    };
  }
  if (isPlainToolIdentifier(identifier)) {
    return {
      toolId: identifier,
      sourceType: ToolSourceType.unknown,
      sourceId: unknownSourceId,
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
  id: string;
  /**
   * Name of the tool, which will be exposed to the LLM.
   */
  name: string;
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
 * Serializable representation of an ESQL tool.
 * 
 * This provides the structure for executing SQL queries with parameterized inputs.
 */
export interface EsqlTool extends ToolDescriptor {
  /**
   * The SQL query to be executed.
   */
  query: string;
  
  /**
   * Parameters that can be used in the query.
   * Each parameter has a key identifier and metadata about its type and usage.
   */
  params: {
    /**
     * The parameter identifier used in the query.
     */
    key: string;
    
    /**
     * Metadata about the parameter.
     */
    value: {
      /**
       * The data type of the parameter.
       */
      type: string;
      
      /**
       * Description of the parameter's purpose or expected values.
       */
      description: string;
    }
  }[];
}

/**
 * Metadata associated with a tool.
 *
 * Some of them are specified by the tool owner during registration,
 * others are automatically added by the framework.
 */
export interface ToolDescriptorMeta {
  /**
   * The type of the source this tool is provided by.
   */
  sourceType: ToolSourceType;
  /**
   * The id of the source this tool is provided by.
   * E.g. for MCP source, this will be the ID of the MCP connector.
   */
  sourceId: string;
  /**
   * Optional list of tags attached to this tool.
   * For built-in tools, this is specified during registration.
   */
  tags: string[];
}
