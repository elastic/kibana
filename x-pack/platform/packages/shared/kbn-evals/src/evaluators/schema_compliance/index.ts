/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { Evaluator, EvaluationResult } from '../../types';

const SCHEMA_COMPLIANCE_EVALUATOR_NAME = 'Schema Compliance';
const SCHEMA_COMPLIANCE_RATE_EVALUATOR_NAME = 'Schema Compliance Rate';
const PARAMETER_COMPLETENESS_EVALUATOR_NAME = 'Parameter Completeness';

/**
 * JSON Schema definition for tool parameters
 */
export interface ToolParameterSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchema;
  enum?: unknown[];
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  [key: string]: unknown;
}

/**
 * Generic JSON Schema type
 */
export type JSONSchema = ToolParameterSchema | boolean;

/**
 * Represents a tool call extracted from task output
 */
export interface ToolCallWithArgs {
  name: string;
  args?: Record<string, unknown>;
}

/**
 * Expected schema specification for tool parameters
 */
export interface ExpectedToolSchemas {
  /**
   * Map of tool names to their expected parameter schemas
   */
  schemas: Record<string, JSONSchema>;
  /**
   * If true, fail when a tool call has no matching schema
   */
  strictMode?: boolean;
}

/**
 * Validation error details
 */
export interface ValidationError {
  toolName: string;
  message: string;
  path?: string;
  keyword?: string;
}

/**
 * Configuration for the schema compliance evaluator
 */
export interface SchemaComplianceEvaluatorConfig<TOutput = unknown, TExpected = unknown> {
  /**
   * Function to extract tool calls from the task output
   */
  extractToolCalls: (output: TOutput) => ToolCallWithArgs[];
  /**
   * Function to extract expected schemas from the example's expected output
   */
  extractExpectedSchemas: (expected: TExpected) => ExpectedToolSchemas;
}

/**
 * Default extractor that looks for common output shapes
 */
export function defaultExtractToolCalls(output: unknown): ToolCallWithArgs[] {
  if (!output || typeof output !== 'object') {
    return [];
  }

  const outputObj = output as Record<string, unknown>;

  // Check for toolCalls array directly on output
  if (Array.isArray(outputObj.toolCalls)) {
    return outputObj.toolCalls.map((tc: unknown) => {
      if (tc && typeof tc === 'object') {
        const toolCall = tc as Record<string, unknown>;
        return {
          name: String(toolCall.name || toolCall.tool || ''),
          args: parseArgs(toolCall.args || toolCall.arguments || toolCall.input),
        };
      }
      return { name: '' };
    });
  }

  // Check for messages array with tool calls (common in chat/agent outputs)
  if (Array.isArray(outputObj.messages)) {
    const toolCalls: ToolCallWithArgs[] = [];
    for (const message of outputObj.messages) {
      if (message && typeof message === 'object') {
        const msg = message as Record<string, unknown>;
        // Check for tool_calls in message
        if (Array.isArray(msg.tool_calls)) {
          for (const tc of msg.tool_calls) {
            if (tc && typeof tc === 'object') {
              const toolCall = tc as Record<string, unknown>;
              const fn = toolCall.function as Record<string, unknown> | undefined;
              toolCalls.push({
                name: String(fn?.name || toolCall.name || ''),
                args: parseArgs(fn?.arguments || toolCall.arguments),
              });
            }
          }
        }
        // Check for tool invocations
        if (Array.isArray(msg.toolInvocations)) {
          for (const tc of msg.toolInvocations) {
            if (tc && typeof tc === 'object') {
              const toolCall = tc as Record<string, unknown>;
              toolCalls.push({
                name: String(toolCall.toolName || toolCall.name || ''),
                args: parseArgs(toolCall.args),
              });
            }
          }
        }
      }
    }
    return toolCalls;
  }

  return [];
}

/**
 * Parse arguments which may be a JSON string or already an object
 */
function parseArgs(args: unknown): Record<string, unknown> | undefined {
  if (!args) {
    return undefined;
  }
  if (typeof args === 'string') {
    try {
      const parsed = JSON.parse(args);
      return typeof parsed === 'object' && parsed !== null ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  if (typeof args === 'object' && args !== null) {
    return args as Record<string, unknown>;
  }
  return undefined;
}

/**
 * Default extractor for expected schemas from the example's expected output
 */
export function defaultExtractExpectedSchemas(expected: unknown): ExpectedToolSchemas {
  if (!expected || typeof expected !== 'object') {
    return { schemas: {} };
  }

  const expectedObj = expected as Record<string, unknown>;

  // Check for expectedSchemas object
  if (expectedObj.expectedSchemas && typeof expectedObj.expectedSchemas === 'object') {
    const schemasSpec = expectedObj.expectedSchemas as ExpectedToolSchemas;
    return {
      schemas: schemasSpec.schemas || {},
      strictMode: schemasSpec.strictMode,
    };
  }

  // Check for schemas object directly
  if (expectedObj.schemas && typeof expectedObj.schemas === 'object') {
    return {
      schemas: expectedObj.schemas as Record<string, JSONSchema>,
      strictMode: expectedObj.strictMode === true,
    };
  }

  // Check for toolSchemas object
  if (expectedObj.toolSchemas && typeof expectedObj.toolSchemas === 'object') {
    return {
      schemas: expectedObj.toolSchemas as Record<string, JSONSchema>,
      strictMode: expectedObj.strictMode === true,
    };
  }

  return { schemas: {} };
}

/**
 * Schema compliance metrics
 */
interface SchemaComplianceMetrics {
  /** Total number of tool calls validated */
  totalToolCalls: number;
  /** Number of tool calls that passed schema validation */
  validToolCalls: number;
  /** Number of tool calls that failed schema validation */
  invalidToolCalls: number;
  /** Number of tool calls with no matching schema */
  unmatchedToolCalls: number;
  /** Compliance rate (valid / (valid + invalid)) */
  complianceRate: number;
  /** List of validation errors */
  errors: ValidationError[];
  /** Tool names that had validation errors */
  failedTools: string[];
  /** Tool names that passed validation */
  passedTools: string[];
  /** Tool names with no matching schema */
  unmatchedTools: string[];
  /** Parameter completeness (required params present / total required) */
  parameterCompleteness: number;
  /** Missing required parameters */
  missingRequiredParams: Array<{ toolName: string; params: string[] }>;
}

/**
 * Compute schema compliance metrics
 */
function computeSchemaComplianceMetrics(
  toolCalls: ToolCallWithArgs[],
  expectedSchemas: ExpectedToolSchemas
): SchemaComplianceMetrics {
  const ajv = new Ajv({
    allErrors: true,
    strict: false,
    validateFormats: true,
  });
  addFormats(ajv);

  const errors: ValidationError[] = [];
  const failedTools: string[] = [];
  const passedTools: string[] = [];
  const unmatchedTools: string[] = [];
  const missingRequiredParams: Array<{ toolName: string; params: string[] }> = [];

  let totalRequiredParams = 0;
  let presentRequiredParams = 0;

  for (const toolCall of toolCalls) {
    const schema = expectedSchemas.schemas[toolCall.name];

    if (!schema) {
      unmatchedTools.push(toolCall.name);
      if (expectedSchemas.strictMode) {
        errors.push({
          toolName: toolCall.name,
          message: `No schema defined for tool "${toolCall.name}"`,
        });
        failedTools.push(toolCall.name);
      }
      continue;
    }

    const args = toolCall.args || {};

    // Track required parameter completeness
    if (typeof schema === 'object' && schema.required && Array.isArray(schema.required)) {
      totalRequiredParams += schema.required.length;
      const missingParams: string[] = [];
      for (const requiredParam of schema.required) {
        if (args[requiredParam] !== undefined) {
          presentRequiredParams++;
        } else {
          missingParams.push(requiredParam);
        }
      }
      if (missingParams.length > 0) {
        missingRequiredParams.push({ toolName: toolCall.name, params: missingParams });
      }
    }

    // Validate against schema
    try {
      const validate = ajv.compile(schema);
      const valid = validate(args);

      if (valid) {
        passedTools.push(toolCall.name);
      } else {
        failedTools.push(toolCall.name);
        for (const error of validate.errors || []) {
          errors.push({
            toolName: toolCall.name,
            message: error.message || 'Validation failed',
            path: error.instancePath || undefined,
            keyword: error.keyword,
          });
        }
      }
    } catch (schemaError) {
      failedTools.push(toolCall.name);
      errors.push({
        toolName: toolCall.name,
        message: `Schema compilation error: ${
          schemaError instanceof Error ? schemaError.message : String(schemaError)
        }`,
      });
    }
  }

  const validToolCalls = passedTools.length;
  const invalidToolCalls = failedTools.length;
  const totalValidated = validToolCalls + invalidToolCalls;
  const complianceRate = totalValidated > 0 ? validToolCalls / totalValidated : 1;
  const parameterCompleteness =
    totalRequiredParams > 0 ? presentRequiredParams / totalRequiredParams : 1;

  return {
    totalToolCalls: toolCalls.length,
    validToolCalls,
    invalidToolCalls,
    unmatchedToolCalls: unmatchedTools.length,
    complianceRate,
    errors,
    failedTools: [...new Set(failedTools)],
    passedTools: [...new Set(passedTools)],
    unmatchedTools: [...new Set(unmatchedTools)],
    parameterCompleteness,
    missingRequiredParams,
  };
}

/**
 * Creates a schema compliance evaluator that verifies tool call parameters match expected schemas.
 *
 * Returns a score of 1 if all tool calls pass schema validation,
 * otherwise returns a score between 0 and 1 based on compliance rate.
 */
export function createSchemaComplianceEvaluator<TOutput = unknown, TExpected = unknown>(
  config?: Partial<SchemaComplianceEvaluatorConfig<TOutput, TExpected>>
): Evaluator {
  const extractToolCalls = config?.extractToolCalls ?? defaultExtractToolCalls;
  const extractExpectedSchemas = config?.extractExpectedSchemas ?? defaultExtractExpectedSchemas;

  return {
    name: SCHEMA_COMPLIANCE_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let toolCalls: ToolCallWithArgs[];
      let expectedSchemas: ExpectedToolSchemas;

      try {
        toolCalls = extractToolCalls(output as TOutput);
        expectedSchemas = extractExpectedSchemas(expected as TExpected);
      } catch (error) {
        return {
          score: null,
          label: 'error',
          explanation: `Failed to extract tool calls or schemas: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (Object.keys(expectedSchemas.schemas).length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No expected schemas specified in the example',
        };
      }

      if (toolCalls.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No tool calls found in output',
        };
      }

      const metrics = computeSchemaComplianceMetrics(toolCalls, expectedSchemas);

      // Determine score and label
      let score: number;
      let label: string;

      if (metrics.invalidToolCalls === 0 && metrics.errors.length === 0) {
        score = 1;
        label = 'pass';
      } else if (metrics.complianceRate > 0) {
        score = metrics.complianceRate;
        label = 'partial';
      } else {
        score = 0;
        label = 'fail';
      }

      const explanationParts: string[] = [];
      explanationParts.push(
        `${metrics.validToolCalls}/${
          metrics.totalToolCalls - metrics.unmatchedToolCalls
        } tool calls passed schema validation (${(metrics.complianceRate * 100).toFixed(0)}%)`
      );

      if (metrics.failedTools.length > 0) {
        explanationParts.push(`Failed: ${metrics.failedTools.join(', ')}`);
      }
      if (metrics.unmatchedTools.length > 0 && expectedSchemas.strictMode) {
        explanationParts.push(`No schema: ${metrics.unmatchedTools.join(', ')}`);
      }
      if (metrics.errors.length > 0) {
        const errorSummary = metrics.errors
          .slice(0, 3)
          .map((e) => `${e.toolName}: ${e.message}`)
          .join('; ');
        explanationParts.push(`Errors: ${errorSummary}`);
        if (metrics.errors.length > 3) {
          explanationParts.push(`... and ${metrics.errors.length - 3} more errors`);
        }
      }

      return {
        score,
        label,
        explanation: explanationParts.join('. '),
        metadata: {
          totalToolCalls: metrics.totalToolCalls,
          validToolCalls: metrics.validToolCalls,
          invalidToolCalls: metrics.invalidToolCalls,
          unmatchedToolCalls: metrics.unmatchedToolCalls,
          complianceRate: metrics.complianceRate,
          failedTools: metrics.failedTools,
          passedTools: metrics.passedTools,
          unmatchedTools: metrics.unmatchedTools,
          errors: metrics.errors,
        },
      };
    },
  };
}

/**
 * Creates a schema compliance rate evaluator.
 * Returns the percentage of tool calls that pass schema validation.
 */
export function createSchemaComplianceRateEvaluator<TOutput = unknown, TExpected = unknown>(
  config?: Partial<SchemaComplianceEvaluatorConfig<TOutput, TExpected>>
): Evaluator {
  const extractToolCalls = config?.extractToolCalls ?? defaultExtractToolCalls;
  const extractExpectedSchemas = config?.extractExpectedSchemas ?? defaultExtractExpectedSchemas;

  return {
    name: SCHEMA_COMPLIANCE_RATE_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let toolCalls: ToolCallWithArgs[];
      let expectedSchemas: ExpectedToolSchemas;

      try {
        toolCalls = extractToolCalls(output as TOutput);
        expectedSchemas = extractExpectedSchemas(expected as TExpected);
      } catch (error) {
        return {
          score: null,
          label: 'error',
          explanation: `Failed to extract tool calls or schemas: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (Object.keys(expectedSchemas.schemas).length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No expected schemas specified in the example',
        };
      }

      if (toolCalls.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No tool calls found in output',
        };
      }

      const metrics = computeSchemaComplianceMetrics(toolCalls, expectedSchemas);

      return {
        score: metrics.complianceRate,
        explanation: `${metrics.validToolCalls} of ${
          metrics.totalToolCalls - metrics.unmatchedToolCalls
        } tool calls passed validation (${(metrics.complianceRate * 100).toFixed(1)}%)`,
        metadata: {
          validToolCalls: metrics.validToolCalls,
          invalidToolCalls: metrics.invalidToolCalls,
          complianceRate: metrics.complianceRate,
        },
      };
    },
  };
}

/**
 * Creates a parameter completeness evaluator.
 * Measures what fraction of required parameters are present in tool calls.
 */
export function createParameterCompletenessEvaluator<TOutput = unknown, TExpected = unknown>(
  config?: Partial<SchemaComplianceEvaluatorConfig<TOutput, TExpected>>
): Evaluator {
  const extractToolCalls = config?.extractToolCalls ?? defaultExtractToolCalls;
  const extractExpectedSchemas = config?.extractExpectedSchemas ?? defaultExtractExpectedSchemas;

  return {
    name: PARAMETER_COMPLETENESS_EVALUATOR_NAME,
    kind: 'CODE',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      let toolCalls: ToolCallWithArgs[];
      let expectedSchemas: ExpectedToolSchemas;

      try {
        toolCalls = extractToolCalls(output as TOutput);
        expectedSchemas = extractExpectedSchemas(expected as TExpected);
      } catch (error) {
        return {
          score: null,
          label: 'error',
          explanation: `Failed to extract tool calls or schemas: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }

      if (Object.keys(expectedSchemas.schemas).length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No expected schemas specified in the example',
        };
      }

      if (toolCalls.length === 0) {
        return {
          score: null,
          label: 'unavailable',
          explanation: 'No tool calls found in output',
        };
      }

      const metrics = computeSchemaComplianceMetrics(toolCalls, expectedSchemas);

      const explanationParts: string[] = [];
      explanationParts.push(
        `Parameter completeness: ${(metrics.parameterCompleteness * 100).toFixed(1)}%`
      );

      if (metrics.missingRequiredParams.length > 0) {
        const missingSummary = metrics.missingRequiredParams
          .slice(0, 3)
          .map((m) => `${m.toolName}: ${m.params.join(', ')}`)
          .join('; ');
        explanationParts.push(`Missing: ${missingSummary}`);
      }

      return {
        score: metrics.parameterCompleteness,
        explanation: explanationParts.join('. '),
        metadata: {
          parameterCompleteness: metrics.parameterCompleteness,
          missingRequiredParams: metrics.missingRequiredParams,
        },
      };
    },
  };
}

/**
 * Creates all schema compliance evaluators with shared configuration.
 */
export function createSchemaComplianceEvaluators<TOutput = unknown, TExpected = unknown>(
  config?: Partial<SchemaComplianceEvaluatorConfig<TOutput, TExpected>>
): Evaluator[] {
  return [
    createSchemaComplianceEvaluator(config),
    createSchemaComplianceRateEvaluator(config),
    createParameterCompletenessEvaluator(config),
  ];
}
