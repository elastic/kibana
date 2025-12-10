/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Function registry
export {
  FUNCTION_REGISTRY,
  BINARY_ARITHMETIC_OPERATORS,
  REJECTED_FUNCTIONS,
  isSupportedFunction,
  isRejectedFunction,
  getFunctionDefinition,
  getRejectionReason,
  validateArity,
} from './function_registry';
export type { FunctionDefinition } from './function_registry';

// AST validator
export { validateMathExpression, getSupportedFunctionNames } from './ast_validator';
export type { ValidationResult } from './ast_validator';

// Field extractor
export { extractFieldReferencesFromMathExpression } from './field_extractor';
