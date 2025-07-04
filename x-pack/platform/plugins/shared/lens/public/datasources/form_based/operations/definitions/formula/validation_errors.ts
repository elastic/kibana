/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { REASON_IDS } from '@kbn/data-plugin/common';

export interface MissingFieldError {
  id: 'missingField';
  meta: { fieldList: string[] };
}

export interface MissingOperationError {
  id: 'missingOperation';
  meta: { operationLength: number; operationsList: string };
}

export interface MissingParameterError {
  id: 'missingParameter';
  meta: { operation: string; params: string };
}

export interface WrongTypeParameterError {
  id: 'wrongTypeParameter';
  meta: { operation: string; params: string };
}

export interface WrongTypeArgumentError {
  id: 'wrongTypeArgument';
  meta: { operation: string; name: string; type: string; expectedType: string };
}

export interface WrongFirstArgument {
  id: 'wrongFirstArgument';
  meta: { operation: string; type: string; argument: string | number };
}

export interface CannotAcceptParameterError {
  id: 'cannotAcceptParameter';
  meta: { operation: string };
}

export interface ShouldNotHaveFieldError {
  id: 'shouldNotHaveField';
  meta: { operation: string };
}

export interface TooManyArgumentsError {
  id: 'tooManyArguments';
  meta: { operation: string };
}

export interface FieldWithNoOperationError {
  id: 'fieldWithNoOperation';
  meta: { field: string };
}

export interface FailedParsingError {
  id: 'failedParsing';
  meta: { expression: string };
}

export interface DuplicateArgumentError {
  id: 'duplicateArgument';
  meta: { operation: string; params: string };
}

export interface DuplicateArgumentError {
  id: 'duplicateArgument';
  meta: { operation: string; params: string };
}

export interface MissingMathArgumentError {
  id: 'missingMathArgument';
  meta: { operation: string; count: number; params: string };
}

export interface TooManyQueriesError {
  id: 'tooManyQueries';
  meta?: {};
}

export interface TooManyFirstArgumentsError {
  id: 'tooManyFirstArguments';
  meta: {
    operation: string;
    type: string;
    text: string;
    supported?: number;
  };
}

export interface WrongArgumentError {
  id: 'wrongArgument';
  meta: { operation: string; text: string; type: string };
}

export interface WrongReturnedTypeError {
  id: 'wrongReturnedType';
  meta: { text: string };
}

export interface FiltersTypeConflictError {
  id: 'filtersTypeConflict';
  meta: { operation: string; outerType: string; innerType: string };
}

export interface UseAlternativeFunctionError {
  id: 'useAlternativeFunction';
  meta: {
    operation: string;
    params: string;
    alternativeFn: string;
  };
}

export interface InvalidQueryError {
  id: 'invalidQuery';
  meta: {
    language: 'kql' | 'lucene';
  };
}

export interface MissingTimerangeError {
  id: typeof REASON_IDS.missingTimerange;
  meta?: {};
}

export interface InvalidDateError {
  id: typeof REASON_IDS.invalidDate;
  meta?: {};
}

export interface ShiftAfterTimeRangeError {
  id: typeof REASON_IDS.shiftAfterTimeRange;
  meta?: {};
}

export interface NotAbsoluteTimeShiftError {
  id: typeof REASON_IDS.notAbsoluteTimeShift;
  meta?: {};
}

export interface InvalidTimeShift {
  id: 'invalidTimeShift';
  meta?: {};
}

export interface InvalidReducedTimeRange {
  id: 'invalidReducedTimeRange';
  meta?: {};
}

export type ValidationErrors =
  | MissingFieldError
  | MissingOperationError
  | MissingParameterError
  | WrongTypeParameterError
  | WrongTypeArgumentError
  | WrongFirstArgument
  | CannotAcceptParameterError
  | ShouldNotHaveFieldError
  | TooManyArgumentsError
  | FieldWithNoOperationError
  | FailedParsingError
  | DuplicateArgumentError
  | DuplicateArgumentError
  | MissingMathArgumentError
  | TooManyQueriesError
  | TooManyFirstArgumentsError
  | WrongArgumentError
  | WrongReturnedTypeError
  | FiltersTypeConflictError
  | UseAlternativeFunctionError
  | InvalidQueryError
  | MissingTimerangeError
  | InvalidDateError
  | ShiftAfterTimeRangeError
  | NotAbsoluteTimeShiftError
  | InvalidTimeShift
  | InvalidReducedTimeRange;
