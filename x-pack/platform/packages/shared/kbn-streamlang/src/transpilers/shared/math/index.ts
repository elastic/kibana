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

// Field extractor and type inference
export { extractFieldsFromMathExpression, inferMathExpressionReturnType } from './field_extractor';

// Language definition - single source of truth for the math expression language
export {
  // Category groups
  LOGARITHMIC_FUNCTIONS,
  COMPARISON_FUNCTIONS,
  ARITHMETIC_OPERATORS,
  COMPARISON_OPERATORS,
  // Combined lists
  ALL_MATH_FUNCTIONS,
  ALL_OPERATORS,
  // Derived sets for validation/type inference
  BOOLEAN_RETURNING_MATH_FUNCTIONS,
  ALL_FUNCTION_NAMES,
  // Helpers
  getMathFunctionDefinition,
  getMathFunctionsByCategory,
  doesFunctionReturnBoolean,
  getMathParameterNames,
  getRequiredArgCount,
  getTotalArgCount,
  getFunctionsWithArity,
  getBinaryComparisonFunctions,
} from './language_definition';
export type {
  MathFunctionDefinition,
  OperatorDefinition,
  MathFunctionCategory,
} from './language_definition';

// Documentation - generated from language_definition
export { getMathExpressionLanguageDocSections } from './language_docs';
export type { MathLanguageDocumentationSections } from './language_docs';
