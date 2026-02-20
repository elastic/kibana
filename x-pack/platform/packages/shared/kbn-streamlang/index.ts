/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { StreamlangDSL, StreamType, StreamlangConditionBlock } from './types/streamlang';
export { streamlangDSLSchema, isActionBlock, isConditionBlock } from './types/streamlang';
export { transpile as transpileIngestPipeline } from './src/transpilers/ingest_pipeline';
export {
  transpile as transpileEsql,
  conditionToESQL,
  conditionToESQLAst,
} from './src/transpilers/esql';
export * from './types/processors';
export * from './types/conditions';
export type * from './types/ui';
export * from './src/conditions/helpers';
export * from './src/conditions/condition_to_query_dsl';
export * from './src/conditions/condition_to_painless';
export * from './src/transpilers/shared/convert_for_ui';
export * from './src/utilities';
export { ACTION_METADATA_MAP, type ActionMetadata } from './src/actions/action_metadata';
export { getJsonSchemaFromStreamlangSchema } from './src/schema/get_json_schema_from_streamlang_schema';
export * from './src/validation';
export {
  validateMathExpression,
  getMathExpressionLanguageDocSections,
  extractFieldsFromMathExpression,
  ALL_MATH_FUNCTIONS,
  BOOLEAN_RETURNING_MATH_FUNCTIONS,
  getMathFunctionDefinition,
  getMathParameterNames,
} from './src/transpilers/shared/math';
export type { MathFunctionDefinition } from './src/transpilers/shared/math';
export {
  getAvailableGrokPatterns,
  compileGrokPatternToRegex,
  compileGrokPatternsToRegex,
  isKnownGrokPattern,
  BASE_GROK_PATTERNS,
} from './types/utils/grok_to_regex';
export type { CompiledRedactPattern } from './types/utils/grok_to_regex';
