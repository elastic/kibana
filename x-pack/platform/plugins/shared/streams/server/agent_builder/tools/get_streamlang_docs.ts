/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ToolType, ToolResultType } from '@kbn/onechat-common';
import type { BuiltinToolDefinition } from '@kbn/onechat-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  NonEmptyString,
  conditionSchema,
  filterConditionSchema,
  shorthandBinaryFilterConditionSchema,
  shorthandUnaryFilterConditionSchema,
  andConditionSchema,
  orConditionSchema,
  notConditionSchema,
  neverConditionSchema,
  alwaysConditionSchema,
  rangeConditionSchema,
  stringOrNumberOrBoolean,
  processorBaseWithWhereSchema,
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  removeProcessorSchema,
  renameProcessorSchema,
  convertProcessorSchema,
  setProcessorSchema,
  appendProcessorSchema,
  replaceProcessorSchema,
  removeByPrefixProcessorSchema,
  dropDocumentProcessorSchema,
} from '@kbn/streamlang';
import type { StreamsPluginStartDependencies } from '../../types';
import { STREAMS_GET_STREAMLANG_DOCS_TOOL_ID } from '../constants';

const getStreamlangDocsSchema = z.object({});

type GetStreamlangDocsParams = z.infer<typeof getStreamlangDocsSchema>;

/**
 * Generate the complete streamlang JSON schema documentation
 */
function getStreamlangJsonSchema() {
  const fullPipelineSchema = z
    .object({
      steps: z.array(
        z.union([
          grokProcessorSchema,
          dissectProcessorSchema,
          dateProcessorSchema,
          removeProcessorSchema,
          renameProcessorSchema,
          convertProcessorSchema,
          setProcessorSchema,
          appendProcessorSchema,
          replaceProcessorSchema,
          removeByPrefixProcessorSchema,
          dropDocumentProcessorSchema,
        ])
      ),
    })
    .describe('Streamlang pipeline definition with all available processor types');

  return zodToJsonSchema(fullPipelineSchema, {
    target: 'openApi3',
    $refStrategy: 'root',
    name: 'StreamlangPipelineDefinition',
    definitions: {
      NonEmptyString,
      StringOrNumberOrBoolean: stringOrNumberOrBoolean,
      RangeCondition: rangeConditionSchema,
      ShorthandBinaryFilterCondition: shorthandBinaryFilterConditionSchema,
      ShorthandUnaryFilterCondition: shorthandUnaryFilterConditionSchema,
      FilterCondition: filterConditionSchema,
      AndCondition: andConditionSchema,
      OrCondition: orConditionSchema,
      NotCondition: notConditionSchema,
      NeverCondition: neverConditionSchema,
      AlwaysCondition: alwaysConditionSchema,
      Condition: conditionSchema,
      ProcessorBase: processorBaseWithWhereSchema,
    },
  });
}

export function createGetStreamlangDocsTool({
  core,
  logger,
}: {
  core: CoreSetup<StreamsPluginStartDependencies>;
  logger: Logger;
}): BuiltinToolDefinition<typeof getStreamlangDocsSchema> {
  return {
    id: STREAMS_GET_STREAMLANG_DOCS_TOOL_ID,
    type: ToolType.builtin,
    description: `Returns the complete JSON schema documentation for Streamlang processors.

This provides detailed schema information for all available processor types including:
- grok: Extract fields from text using grok patterns
- dissect: Parse delimiter-based logs efficiently
- date: Parse and normalize date/time fields
- rename: Rename fields in documents
- set: Set field values (with optional conditions)
- append: Append values to array fields
- remove: Remove specific fields
- remove_by_prefix: Remove all fields matching a prefix
- replace: Replace field values with regex patterns
- convert: Convert field types (string, long, double, boolean, etc.)
- drop_document: Drop entire documents based on conditions

Each processor schema includes:
- Required and optional fields with descriptions
- Field types and validation constraints
- Conditional execution support (where clause)
- Error handling options (ignore_failure)
- Field naming conventions and restrictions

Use this when you need to:
- Understand the exact structure required for streamlang processors
- See all available processor types and their options
- Construct valid processor configurations
- Learn about conditional execution and error handling`,
    tags: ['streams', 'streamlang', 'documentation', 'schema', 'processors'],
    schema: getStreamlangDocsSchema,
    handler: async ({}: GetStreamlangDocsParams) => {
      const schema = getStreamlangJsonSchema();

      return {
        results: [
          {
            type: ToolResultType.json,
            data: schema,
          },
        ],
      };
    },
  };
}
