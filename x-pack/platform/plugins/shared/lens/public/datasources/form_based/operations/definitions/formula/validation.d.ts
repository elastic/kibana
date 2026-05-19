import type { TinymathAST, TinymathFunction, TinymathNamedArgument, TinymathLocation } from '@kbn/tinymath';
import type { Query } from '@kbn/es-query';
import type { DateRange, GenericIndexPatternColumn, FormBasedLayer, IndexPattern } from '@kbn/lens-common';
import type { OperationDefinition, GenericOperationDefinition } from '..';
import type { TinymathNodeTypes } from './types';
import type { InvalidQueryError, ValidationErrors } from './validation_errors';
export type ErrorWrapper = ValidationErrors & {
    message: string;
    locations: TinymathLocation[];
    severity?: 'error' | 'warning';
};
export declare function isParsingError(message: string): boolean;
export declare function hasInvalidOperations(node: TinymathAST | string, operations: Record<string, GenericOperationDefinition>): {
    names: string[];
    locations: TinymathLocation[];
};
export declare const getRawQueryValidationError: (text: string, operations: Record<string, unknown>) => (InvalidQueryError & {
    message: string;
}) | undefined;
export declare const getQueryValidationError: ({ value: query, name: language, text }: TinymathNamedArgument, indexPattern: IndexPattern) => string | undefined;
export declare function tryToParse(formula: string, operations: Record<string, unknown>): {
    root: TinymathAST;
} | {
    error: ErrorWrapper;
};
export declare function runASTValidation(ast: TinymathAST, layer: FormBasedLayer, indexPattern: IndexPattern, operations: Record<string, GenericOperationDefinition>, currentColumn: GenericIndexPatternColumn, dateRange?: DateRange): ErrorWrapper[];
export declare function canHaveParams(operation: OperationDefinition<GenericIndexPatternColumn, 'field'> | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>): boolean | {
    helpMessage: string;
} | undefined;
export declare function getInvalidParams(operation: OperationDefinition<GenericIndexPatternColumn, 'field'> | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>, params?: TinymathNamedArgument[]): {
    name: string;
    isMissing: boolean;
    isCorrectType: boolean;
    isRequired: boolean | undefined;
}[];
export declare function getMissingParams(operation: OperationDefinition<GenericIndexPatternColumn, 'field'> | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>, params?: TinymathNamedArgument[]): {
    name: string;
    isMissing: boolean;
    isCorrectType: boolean;
    isRequired: boolean | undefined;
}[];
export declare function getWrongTypeParams(operation: OperationDefinition<GenericIndexPatternColumn, 'field'> | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>, params?: TinymathNamedArgument[]): {
    name: string;
    isMissing: boolean;
    isCorrectType: boolean;
    isRequired: boolean | undefined;
}[];
export declare function hasFiltersConflicts(operation: OperationDefinition<GenericIndexPatternColumn, 'field'> | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>, params?: TinymathNamedArgument[], globalFilter?: Query): {
    conflicts: boolean;
    innerType?: undefined;
    outerType?: undefined;
} | {
    conflicts: boolean;
    innerType: string;
    outerType: string;
};
export declare function validateParams(operation: OperationDefinition<GenericIndexPatternColumn, 'field'> | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>, params?: TinymathNamedArgument[]): {
    name: string;
    isMissing: boolean;
    isCorrectType: boolean;
    isRequired: boolean | undefined;
}[];
export declare function shouldHaveFieldArgument(node: TinymathFunction): boolean;
export declare function hasFunctionFieldArgument(type: string): boolean;
export declare function isArgumentValidType(arg: TinymathAST | string, type: TinymathNodeTypes['type']): boolean;
export declare function validateMathNodes(root: TinymathAST, missingVariableSet: Set<string>, operations: Record<string, GenericOperationDefinition>): ErrorWrapper[];
