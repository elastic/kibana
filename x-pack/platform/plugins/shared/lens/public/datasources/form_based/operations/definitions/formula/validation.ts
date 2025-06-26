/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isObject, partition } from 'lodash';
import { i18n } from '@kbn/i18n';
import { parse, TinymathLocation, TinymathVariable } from '@kbn/tinymath';
import type { TinymathAST, TinymathFunction, TinymathNamedArgument } from '@kbn/tinymath';
import { luceneStringToDsl, toElasticsearchQuery, fromKueryExpression } from '@kbn/es-query';
import { tinymathFunctions, getTypeI18n } from '@kbn/lens-formula-docs';
import type { Query } from '@kbn/es-query';
import {
  isAbsoluteTimeShift,
  parseTimeShift,
  REASON_IDS,
  validateAbsoluteTimeShift,
} from '@kbn/data-plugin/common';
import { nonNullable } from '../../../../../utils';
import { DateRange } from '../../../../../../common/types';
import {
  findMathNodes,
  findVariables,
  getOperationParams,
  getValueOrName,
  groupArgsByType,
  isMathNode,
} from './util';

import type {
  OperationDefinition,
  GenericIndexPatternColumn,
  GenericOperationDefinition,
} from '..';
import type { FormBasedLayer } from '../../../types';
import type { IndexPattern } from '../../../../../types';
import type { TinymathNodeTypes } from './types';
import { InvalidQueryError, ValidationErrors } from './validation_errors';

export type ErrorWrapper = ValidationErrors & {
  message: string;
  locations: TinymathLocation[];
  severity?: 'error' | 'warning';
};

const DEFAULT_RETURN_TYPE = getTypeI18n('number');

function getNodeLocation(node: TinymathFunction): TinymathLocation[] {
  return [node.location].filter(nonNullable);
}

function getArgumentType(arg: TinymathAST, operations: Record<string, GenericOperationDefinition>) {
  if (!isObject(arg)) {
    return getTypeI18n(typeof arg);
  }
  if (arg.type === 'function') {
    if (tinymathFunctions[arg.name]) {
      return tinymathFunctions[arg.name].outputType ?? DEFAULT_RETURN_TYPE;
    }
    // Assume it's a number for now
    if (operations[arg.name]) {
      return DEFAULT_RETURN_TYPE;
    }
  }
  // leave for now other argument types
}

export function isParsingError(message: string) {
  return message.includes('Failed to parse expression');
}

function findFunctionNodes(root: TinymathAST | string): TinymathFunction[] {
  function flattenFunctionNodes(node: TinymathAST | string): TinymathFunction[] {
    if (!isObject(node) || node.type !== 'function') {
      return [];
    }
    return [node, ...node.args.flatMap(flattenFunctionNodes)].filter(nonNullable);
  }

  return flattenFunctionNodes(root);
}

export function hasInvalidOperations(
  node: TinymathAST | string,
  operations: Record<string, GenericOperationDefinition>
): { names: string[]; locations: TinymathLocation[] } {
  const nodes = findFunctionNodes(node).filter((v) => !isMathNode(v) && !operations[v.name]);
  return {
    // avoid duplicates
    names: Array.from(new Set(nodes.map(({ name }) => name))),
    locations: nodes.map(({ location }) => location).filter(nonNullable),
  };
}

export const getRawQueryValidationError = (
  text: string,
  operations: Record<string, unknown>
): (InvalidQueryError & { message: string }) | undefined => {
  // try to extract the query context here
  const singleLine = text.split('\n').join('');
  const languagesRegexp = /(kql|lucene)/;
  const allArgs = singleLine.split(',').filter((args) => languagesRegexp.test(args));
  // check for the presence of a valid ES operation
  const containsOneValidOperation = Object.keys(operations).some((operation) =>
    singleLine.includes(operation)
  );
  // no args or no valid operation, no more work to do here
  if (allArgs.length === 0 || !containsOneValidOperation) {
    return undefined;
  }
  // at this point each entry in allArgs may contain one or more
  // in the worst case it would be a math chain of count operation
  // For instance: count(kql=...) + count(lucene=...) - count(kql=...)
  // therefore before partition them, split them by "count" keywork and filter only string with a length
  const flattenArgs = allArgs.flatMap((arg) =>
    arg.split('count').filter((subArg) => languagesRegexp.test(subArg))
  );
  const [kqlQueries, luceneQueries] = partition(flattenArgs, (arg) => /kql/.test(arg));
  for (const kqlQuery of kqlQueries) {
    const message = validateQueryQuotes(kqlQuery, 'kql');
    if (message) {
      return {
        id: 'invalidQuery',
        meta: {
          language: 'kql',
        },
        message,
      };
    }
  }
  for (const luceneQuery of luceneQueries) {
    const message = validateQueryQuotes(luceneQuery, 'lucene');
    if (message) {
      return {
        id: 'invalidQuery',
        meta: {
          language: 'lucene',
        },
        message,
      };
    }
  }
};

const validateQueryQuotes = (rawQuery: string, language: 'kql' | 'lucene') => {
  // check if the raw argument has the minimal requirements
  // use the rest operator here to handle cases where comparison operations are used in the query
  const [, ...rawValue] = rawQuery.split('=');
  const fullRawValue = (rawValue || ['']).join('');
  const cleanedRawValue = fullRawValue.trim();
  // it must start with a single quote, and quotes must have a closure
  if (
    cleanedRawValue.length &&
    (cleanedRawValue[0] !== "'" || !/'\s*([^']+?)\s*'/.test(fullRawValue)) &&
    // there's a special case when it's valid as two single quote strings
    cleanedRawValue !== "''"
  ) {
    return i18n.translate('xpack.lens.indexPattern.formulaOperationQueryError', {
      defaultMessage: `Single quotes are required for {language}='' at {rawQuery}`,
      values: { language, rawQuery },
    });
  }
};

export const getQueryValidationError = (
  { value: query, name: language, text }: TinymathNamedArgument,
  indexPattern: IndexPattern
): string | undefined => {
  if (language !== 'kql' && language !== 'lucene') {
    return;
  }
  // check if the raw argument has the minimal requirements
  const result = validateQueryQuotes(text, language);
  // forward the error here is ok?
  if (result) {
    return result;
  }
  try {
    if (language === 'kql') {
      toElasticsearchQuery(fromKueryExpression(query), indexPattern);
    } else {
      luceneStringToDsl(query);
    }
    return;
  } catch (e) {
    return e.message;
  }
};

function getMessageFromId(
  { id, meta }: ValidationErrors,
  locations: TinymathLocation[]
): ErrorWrapper {
  switch (id) {
    case 'invalidQuery':
      return {
        id,
        meta,
        locations,
        // this is just a placeholder because the actual message comes from the query validator
        message: i18n.translate('xpack.lens.indexPattern.invalidQuery', {
          defaultMessage: 'Invalid {language} query, please check the syntax and retry',
          values: { language: meta.language },
        }),
      };
    case 'wrongFirstArgument':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaOperationWrongFirstArgument', {
          defaultMessage:
            'The first argument for {operation} should be a {type} name. Found {argument}',
          values: { operation: meta.operation, type: meta.type, argument: meta.argument },
        }),
      };
    case 'shouldNotHaveField':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaFieldNotRequired', {
          defaultMessage: 'The operation {operation} does not accept any field as argument',
          values: { operation: meta.operation },
        }),
      };
    case 'cannotAcceptParameter':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaParameterNotRequired', {
          defaultMessage: 'The operation {operation} does not accept any parameter',
          values: { operation: meta.operation },
        }),
      };
    case 'missingParameter':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaExpressionNotHandled', {
          defaultMessage:
            'The operation {operation} in the Formula is missing the following parameters: {params}',
          values: { operation: meta.operation, params: meta.params },
        }),
      };
    case 'wrongTypeParameter':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaExpressionWrongType', {
          defaultMessage:
            'The parameters for the operation {operation} in the Formula are of the wrong type: {params}',
          values: { operation: meta.operation, params: meta.params },
        }),
      };
    case 'wrongTypeArgument':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaExpressionWrongTypeArgument', {
          defaultMessage:
            'The {name} argument for the operation {operation} in the Formula is of the wrong type: {type} instead of {expectedType}',
          values: {
            operation: meta.operation,
            name: meta.name,
            type: meta.type,
            expectedType: meta.expectedType,
          },
        }),
      };
    case 'duplicateArgument':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaOperationDuplicateParams', {
          defaultMessage:
            'The parameters for the operation {operation} have been declared multiple times: {params}',
          values: { operation: meta.operation, params: meta.params },
        }),
      };
    case 'missingField':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaFieldNotFound', {
          defaultMessage:
            '{missingFieldCount, plural, one {Field} other {Fields}} {missingFieldList} not found',
          values: {
            missingFieldCount: meta.fieldList.length,
            missingFieldList: meta.fieldList.join(', '),
          },
        }),
      };
    case 'missingOperation':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.operationsNotFound', {
          defaultMessage:
            '{operationLength, plural, one {Operation} other {Operations}} {operationsList} not found',
          values: { operationLength: meta.operationLength, operationsList: meta.operationsList },
        }),
      };
    case 'fieldWithNoOperation':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.fieldNoOperation', {
          defaultMessage: 'The field {field} cannot be used without operation',
          values: { field: meta.field },
        }),
      };
    case 'failedParsing':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaExpressionParseError', {
          defaultMessage: 'The Formula {expression} cannot be parsed',
          values: { expression: meta.expression },
        }),
      };
    case 'tooManyArguments':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaWithTooManyArguments', {
          defaultMessage: 'The operation {operation} has too many arguments',
          values: { operation: meta.operation },
        }),
      };
    case 'missingMathArgument':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaMathMissingArgument', {
          defaultMessage:
            'The operation {operation} in the Formula is missing {count} arguments: {params}',
          values: { operation: meta.operation, count: meta.count, params: meta.params },
        }),
      };
    case 'tooManyQueries':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaOperationDoubleQueryError', {
          defaultMessage: 'Use only one of kql= or lucene=, not both',
        }),
      };
    case 'tooManyFirstArguments':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaOperationTooManyFirstArguments', {
          defaultMessage:
            'The operation {operation} in the Formula requires a {supported, plural, one {single} other {supported}} {type}, found: {text}',
          values: {
            operation: meta.operation,
            text: meta.text,
            type: meta.type,
            supported: meta.supported || 1,
          },
        }),
      };
    case 'wrongArgument':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaOperationwrongArgument', {
          defaultMessage:
            'The operation {operation} in the Formula does not support {type} parameters, found: {text}',
          values: { operation: meta.operation, text: meta.text, type: meta.type },
        }),
      };
    case 'wrongReturnedType':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaOperationWrongReturnedType', {
          defaultMessage:
            'The return value type of the operation {text} is not supported in Formula',
          values: { text: meta.text },
        }),
      };
    case 'filtersTypeConflict':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaOperationFiltersTypeConflicts', {
          defaultMessage:
            'The Formula filter of type "{outerType}" is not compatible with the inner filter of type "{innerType}" from the {operation} operation',
          values: {
            operation: meta.operation,
            outerType: meta.outerType,
            innerType: meta.innerType,
          },
        }),
      };
    case 'useAlternativeFunction':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.formulaUseAlternative', {
          defaultMessage: `The operation {operation} in the Formula is missing the {params} argument: use the {alternativeFn} operation instead`,
          values: {
            operation: meta.operation,
            params: meta.params,
            alternativeFn: meta.alternativeFn,
          },
        }),
      };
    case REASON_IDS.missingTimerange:
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.absoluteMissingTimeRange', {
          defaultMessage: 'Invalid time shift. No time range found as reference',
        }),
      };
    case REASON_IDS.invalidDate:
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.absoluteInvalidDate', {
          defaultMessage: 'Invalid time shift. The date is not of the correct format',
        }),
      };
    case REASON_IDS.shiftAfterTimeRange:
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.absoluteAfterTimeRange', {
          defaultMessage: 'Invalid time shift. The provided date is after the current time range',
        }),
      };

    case REASON_IDS.notAbsoluteTimeShift:
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.notAbsoluteTimeShift', {
          defaultMessage: 'Invalid time shift.',
        }),
      };
    case 'invalidTimeShift':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.invalidTimeShift', {
          defaultMessage:
            'Invalid time shift. Enter positive integer amount followed by one of the units s, m, h, d, w, M, y. For example 3h for 3 hours',
        }),
      };
    case 'invalidReducedTimeRange':
      return {
        id,
        meta,
        locations,
        message: i18n.translate('xpack.lens.indexPattern.invalidReducedTimeRange', {
          defaultMessage:
            'Invalid reduced time range. Enter positive integer amount followed by one of the units s, m, h, d, w, M, y. For example 3h for 3 hours',
        }),
      };
  }
}

export function tryToParse(
  formula: string,
  operations: Record<string, unknown>
): { root: TinymathAST } | { error: ErrorWrapper } {
  let root: TinymathAST;
  try {
    root = parse(formula);
  } catch (e) {
    // A tradeoff is required here, unless we want to reimplement a full parser
    // Internally the function has the following logic:
    // * if the formula contains no existing ES operation, assume it's a plain parse failure
    // * if the formula contains at least one existing operation, check for query problems
    const maybeQueryProblems = getRawQueryValidationError(formula, operations);
    if (maybeQueryProblems) {
      return { error: { ...maybeQueryProblems, locations: [] } };
    }
    return {
      error: getMessageFromId({ id: 'failedParsing', meta: { expression: formula } }, []),
    };
  }
  return { root };
}

export function runASTValidation(
  ast: TinymathAST,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>,
  currentColumn: GenericIndexPatternColumn,
  dateRange?: DateRange
) {
  return [
    ...checkMissingVariableOrFunctions(ast, layer, indexPattern, operations),
    ...checkTopNodeReturnType(ast),
    ...runFullASTValidation(ast, layer, indexPattern, operations, dateRange, currentColumn),
  ];
}

function checkVariableEdgeCases(ast: TinymathAST, missingVariables: Set<string>) {
  const invalidVariableErrors = [];
  if (isObject(ast) && ast.type === 'variable' && !missingVariables.has(ast.value)) {
    invalidVariableErrors.push(
      getMessageFromId({ id: 'fieldWithNoOperation', meta: { field: ast.value } }, [ast.location])
    );
  }
  return invalidVariableErrors;
}

function checkMissingVariableOrFunctions(
  ast: TinymathAST,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>
): ErrorWrapper[] {
  const missingErrors: ErrorWrapper[] = [];
  const missingOperations = hasInvalidOperations(ast, operations);

  if (missingOperations.names.length) {
    missingErrors.push(
      getMessageFromId(
        {
          id: 'missingOperation',
          meta: {
            operationLength: missingOperations.names.length,
            operationsList: missingOperations.names.join(', '),
          },
        },
        missingOperations.locations
      )
    );
  }
  const missingVariables = findVariables(ast).filter(
    // filter empty string as well?
    ({ value }) => !indexPattern.getFieldByName(value) && !layer.columns[value]
  );

  // need to check the arguments here: check only strings for now
  if (missingVariables.length) {
    missingErrors.push({
      ...getMessageFromId(
        {
          id: 'missingField',
          meta: {
            fieldList: [...new Set(missingVariables.map(({ value }) => value))],
          },
        },
        missingVariables.map(({ location }) => location)
      ),
    });
  }
  const invalidVariableErrors = checkVariableEdgeCases(
    ast,
    new Set(missingVariables.map(({ value }) => value))
  );
  return [...missingErrors, ...invalidVariableErrors];
}

function getQueryValidationErrors(
  namedArguments: TinymathNamedArgument[] | undefined,
  indexPattern: IndexPattern,
  dateRange: DateRange | undefined
): ErrorWrapper[] {
  const errors: ErrorWrapper[] = [];
  (namedArguments ?? []).forEach((arg) => {
    if (arg.name === 'kql' || arg.name === 'lucene') {
      const message = getQueryValidationError(arg, indexPattern);
      if (message) {
        errors.push({
          id: 'invalidQuery',
          message,
          meta: {
            language: arg.name,
          },
          locations: [arg.location],
        });
      }
    }

    if (arg.name === 'shift') {
      const parsedShift = parseTimeShift(arg.value);
      if (parsedShift === 'invalid') {
        if (isAbsoluteTimeShift(arg.value)) {
          // try to parse as absolute time shift
          const errorId = validateAbsoluteTimeShift(
            arg.value,
            dateRange
              ? {
                  from: dateRange.fromDate,
                  to: dateRange.toDate,
                }
              : undefined
          );
          if (errorId) {
            errors.push(getMessageFromId({ id: errorId }, [arg.location]));
          }
        } else {
          errors.push(getMessageFromId({ id: 'invalidTimeShift' }, [arg.location]));
        }
      }
    }
    if (arg.name === 'reducedTimeRange') {
      const parsedReducedTimeRange = parseTimeShift(arg.value || '');
      if (parsedReducedTimeRange === 'invalid' || parsedReducedTimeRange === 'previous') {
        errors.push(getMessageFromId({ id: 'invalidReducedTimeRange' }, [arg.location]));
      }
    }
  });
  return errors;
}

function checkSingleQuery(namedArguments: TinymathNamedArgument[] | undefined) {
  return namedArguments
    ? namedArguments.filter((arg) => arg.name === 'kql' || arg.name === 'lucene').length > 1
    : undefined;
}

function validateFiltersArguments(
  node: TinymathFunction,
  nodeOperation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  namedArguments: TinymathNamedArgument[] | undefined,
  globalFilters?: Query
): ErrorWrapper[] {
  const errors: ErrorWrapper[] = [];
  const { conflicts, innerType, outerType } = hasFiltersConflicts(
    nodeOperation,
    namedArguments,
    globalFilters
  );
  if (conflicts) {
    if (innerType && outerType) {
      errors.push(
        getMessageFromId(
          {
            id: 'filtersTypeConflict',
            meta: {
              operation: node.name,
              innerType,
              outerType,
            },
          },
          getNodeLocation(node)
        )
      );
    }
  }
  return errors;
}

function validateNameArguments(
  node: TinymathFunction,
  nodeOperation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  namedArguments: TinymathNamedArgument[] | undefined,
  indexPattern: IndexPattern,
  dateRange: DateRange | undefined
): ErrorWrapper[] {
  const errors: ErrorWrapper[] = [];
  const missingParams = getMissingParams(nodeOperation, namedArguments);
  if (missingParams.length) {
    errors.push(
      getMessageFromId(
        {
          id: 'missingParameter',
          meta: {
            operation: node.name,
            params: missingParams.map(({ name }) => name).join(', '),
          },
        },
        getNodeLocation(node)
      )
    );
  }
  const wrongTypeParams = getWrongTypeParams(nodeOperation, namedArguments);
  if (wrongTypeParams.length) {
    errors.push(
      getMessageFromId(
        {
          id: 'wrongTypeParameter',
          meta: {
            operation: node.name,
            params: wrongTypeParams.map(({ name }) => name).join(', '),
          },
        },
        getNodeLocation(node)
      )
    );
  }
  const duplicateParams = getDuplicateParams(namedArguments);
  if (duplicateParams.length) {
    errors.push(
      getMessageFromId(
        {
          id: 'duplicateArgument',
          meta: {
            operation: node.name,
            params: duplicateParams.join(', '),
          },
        },
        getNodeLocation(node)
      )
    );
  }
  const queryValidationErrors = getQueryValidationErrors(namedArguments, indexPattern, dateRange);
  errors.push(...queryValidationErrors);

  const hasTooManyQueries = checkSingleQuery(namedArguments);
  if (hasTooManyQueries) {
    errors.push(getMessageFromId({ id: 'tooManyQueries' }, getNodeLocation(node)));
  }
  return errors;
}

function checkTopNodeReturnType(ast: TinymathAST): ErrorWrapper[] {
  if (
    isObject(ast) &&
    ast.type === 'function' &&
    ast.text &&
    (tinymathFunctions[ast.name]?.outputType || DEFAULT_RETURN_TYPE) !== DEFAULT_RETURN_TYPE
  ) {
    return [
      getMessageFromId({ id: 'wrongReturnedType', meta: { text: ast.text } }, getNodeLocation(ast)),
    ];
  }
  return [];
}

function runFullASTValidation(
  ast: TinymathAST,
  layer: FormBasedLayer,
  indexPattern: IndexPattern,
  operations: Record<string, GenericOperationDefinition>,
  dateRange?: DateRange,
  currentColumn?: GenericIndexPatternColumn
): ErrorWrapper[] {
  const missingVariables = findVariables(ast).filter(
    // filter empty string as well?
    ({ value }) => !indexPattern.getFieldByName(value) && !layer.columns[value]
  );
  const missingVariablesSet = new Set(missingVariables.map(({ value }) => value));
  const globalFilter = currentColumn?.filter;

  function validateNode(node: TinymathAST): ErrorWrapper[] {
    if (!isObject(node) || node.type !== 'function') {
      return [];
    }
    const nodeOperation = operations[node.name];
    const errors: ErrorWrapper[] = [];
    const { namedArguments, functions, variables } = groupArgsByType(node.args);
    const [firstArg] = node?.args || [];

    if (!nodeOperation) {
      errors.push(...validateMathNodes(node, missingVariablesSet, operations));
      // carry on with the validation for all the functions within the math operation
      if (functions?.length) {
        return errors.concat(functions.flatMap((fn) => validateNode(fn)));
      }
    } else {
      if (nodeOperation.input === 'field') {
        if (!isArgumentValidType(firstArg, 'variable')) {
          if (isMathNode(firstArg)) {
            errors.push(
              getMessageFromId(
                {
                  id: 'wrongFirstArgument',
                  meta: {
                    operation: node.name,
                    type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
                      defaultMessage: 'field',
                    }),
                    argument: `math operation`,
                  },
                },
                getNodeLocation(node)
              )
            );
          } else {
            if (shouldHaveFieldArgument(node)) {
              errors.push(
                getMessageFromId(
                  {
                    id: 'wrongFirstArgument',
                    meta: {
                      operation: node.name,
                      type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
                        defaultMessage: 'field',
                      }),
                      argument:
                        getValueOrName(firstArg) ||
                        i18n.translate('xpack.lens.indexPattern.formulaNoFieldForOperation', {
                          defaultMessage: 'no field',
                        }),
                    },
                  },
                  getNodeLocation(node)
                )
              );
            }
          }
        } else {
          // If the first argument is valid proceed with the other arguments validation
          const fieldErrors = validateFieldArguments(node, variables, {
            isFieldOperation: true,
            firstArg,
            returnedType: getReturnedType(nodeOperation, indexPattern, firstArg),
          });
          if (fieldErrors.length) {
            errors.push(...fieldErrors);
          }
        }
        const functionErrors = validateFunctionArguments(node, functions, 0, {
          isFieldOperation: true,
          type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
            defaultMessage: 'field',
          }),
          firstArgValidation: false,
        });
        if (functionErrors.length) {
          errors.push(...functionErrors);
        }
        if (!canHaveParams(nodeOperation) && namedArguments.length) {
          errors.push(
            getMessageFromId(
              { id: 'cannotAcceptParameter', meta: { operation: node.name } },
              getNodeLocation(node)
            )
          );
        } else {
          const argumentsErrors = validateNameArguments(
            node,
            nodeOperation,
            namedArguments,
            indexPattern,
            dateRange
          );

          const filtersErrors = validateFiltersArguments(
            node,
            nodeOperation,
            namedArguments,
            globalFilter
          );
          errors.push(...argumentsErrors, ...filtersErrors);
        }
        return errors;
      }
      if (nodeOperation.input === 'fullReference') {
        // What about fn(7 + 1)? We may want to allow that
        // In general this should be handled down the Esaggs route rather than here
        const isFirstArgumentNotValid = Boolean(
          !isArgumentValidType(firstArg, 'function') ||
            (isMathNode(firstArg) &&
              validateMathNodes(firstArg, missingVariablesSet, operations).length)
        );
        // First field has a special handling
        if (isFirstArgumentNotValid) {
          errors.push(
            getMessageFromId(
              {
                id: 'wrongFirstArgument',
                meta: {
                  operation: node.name,
                  type: i18n.translate('xpack.lens.indexPattern.formulaOperationValue', {
                    defaultMessage: 'operation',
                  }),
                  argument:
                    getValueOrName(firstArg) ||
                    i18n.translate('xpack.lens.indexPattern.formulaNoOperation', {
                      defaultMessage: 'no operation',
                    }),
                },
              },
              getNodeLocation(node)
            )
          );
        }
        // Check for multiple function passed
        const requiredFunctions = nodeOperation.requiredReferences
          ? nodeOperation.requiredReferences.length
          : 1;
        const functionErrors = validateFunctionArguments(node, functions, requiredFunctions, {
          isFieldOperation: false,
          firstArgValidation: isFirstArgumentNotValid,
          type: i18n.translate('xpack.lens.indexPattern.formulaMetricValue', {
            defaultMessage: 'metric',
          }),
        });
        if (functionErrors.length) {
          errors.push(...functionErrors);
        }

        if (!canHaveParams(nodeOperation) && namedArguments.length) {
          errors.push(
            getMessageFromId(
              {
                id: 'cannotAcceptParameter',
                meta: {
                  operation: node.name,
                },
              },
              getNodeLocation(node)
            )
          );
        } else {
          // check for fields passed at any position
          const fieldErrors = validateFieldArguments(node, variables, {
            isFieldOperation: false,
            firstArg,
            returnedType: undefined,
          });
          const argumentsErrors = validateNameArguments(
            node,
            nodeOperation,
            namedArguments,
            indexPattern,
            dateRange
          );
          const filtersErrors = validateFiltersArguments(
            node,
            nodeOperation,
            namedArguments,
            globalFilter
          );
          errors.push(...fieldErrors, ...argumentsErrors, ...filtersErrors);
        }
      }
      return errors.concat(validateNode(functions[0]));
    }
    return errors;
  }

  return validateNode(ast);
}

export function canHaveParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>
) {
  return Boolean((operation.operationParams || []).length) || operation.filterable;
}

export function getInvalidParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isMissing, isCorrectType, isRequired }) => (isMissing && isRequired) || !isCorrectType
  );
}

export function getMissingParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isMissing, isRequired }) => isMissing && isRequired
  );
}

export function getWrongTypeParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  return validateParams(operation, params).filter(
    ({ isCorrectType, isMissing }) => !isCorrectType && !isMissing
  );
}

function getReturnedType(
  operation: OperationDefinition<GenericIndexPatternColumn, 'field'>,
  indexPattern: IndexPattern,
  firstArg: TinymathAST
) {
  const variables = findVariables(firstArg);
  if (variables.length !== 1) {
    return;
  }
  const field = indexPattern.getFieldByName(getValueOrName(variables[0]) as string);
  // while usually this is used where it is safe, as generic function it should check anyway
  if (!field) {
    return;
  }
  // here we're validating the support of the returned type for Formula, not for the operation itself
  // that is already handled indipendently by the operation. So return the scale type
  return operation.getPossibleOperationForField(field)?.scale;
}

function getDuplicateParams(params: TinymathNamedArgument[] = []) {
  const uniqueArgs = Object.create(null);
  for (const { name } of params) {
    const counter = uniqueArgs[name] || 0;
    uniqueArgs[name] = counter + 1;
  }
  const uniqueNames = Object.keys(uniqueArgs);
  if (params.length > uniqueNames.length) {
    return uniqueNames.filter((name) => uniqueArgs[name] > 1);
  }
  return [];
}

export function hasFiltersConflicts(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = [],
  globalFilter?: Query
) {
  const paramsObj = getOperationParams(operation, params);
  if (!operation.filterable || !globalFilter || !(paramsObj.kql || paramsObj.lucene)) {
    return { conflicts: false };
  }
  const language = globalFilter.language === 'kuery' ? 'kql' : globalFilter.language;
  const conflicts = !(language in paramsObj);
  return {
    conflicts,
    innerType: paramsObj.lucene ? 'lucene' : 'kql',
    outerType: language,
  };
}

export function validateParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
) {
  const paramsObj = getOperationParams(operation, params);
  const formalArgs = [...(operation.operationParams ?? [])];
  if (operation.filterable) {
    formalArgs.push(
      { name: 'kql', type: 'string', required: false },
      { name: 'lucene', type: 'string', required: false }
    );
  }
  return formalArgs.map(({ name, type, required }) => ({
    name,
    isMissing: !(name in paramsObj),
    isCorrectType: typeof paramsObj[name] === type,
    isRequired: required,
  }));
}

export function shouldHaveFieldArgument(node: TinymathFunction) {
  return hasFunctionFieldArgument(node.name);
}

export function hasFunctionFieldArgument(type: string) {
  return !['count'].includes(type);
}

export function isArgumentValidType(arg: TinymathAST | string, type: TinymathNodeTypes['type']) {
  return isObject(arg) && arg.type === type;
}

export function validateMathNodes(
  root: TinymathAST,
  missingVariableSet: Set<string>,
  operations: Record<string, GenericOperationDefinition>
) {
  const mathNodes = findMathNodes(root);
  const errors: ErrorWrapper[] = [];
  mathNodes.forEach((node: TinymathFunction) => {
    const { positionalArguments } = tinymathFunctions[node.name];
    const mandatoryArguments = positionalArguments.filter(({ optional }) => !optional);
    if (!node.args.length) {
      // we can stop here
      return errors.push(
        getMessageFromId(
          {
            id: 'missingMathArgument',
            meta: {
              operation: node.name,
              count: mandatoryArguments.length,
              params: mandatoryArguments.map(({ name }) => name).join(', '),
            },
          },
          getNodeLocation(node)
        )
      );
    }

    if (node.args.length > positionalArguments.length) {
      errors.push(
        getMessageFromId(
          { id: 'tooManyArguments', meta: { operation: node.name } },
          getNodeLocation(node)
        )
      );
    }

    // no need to iterate all the arguments, one field is enough to trigger the error
    const hasFieldAsArgument = positionalArguments.some((requirements, index) => {
      const arg = node.args[index];
      if (arg != null && typeof arg !== 'number') {
        return arg.type === 'variable' && !missingVariableSet.has(arg.value);
      }
    });
    if (hasFieldAsArgument) {
      errors.push(
        getMessageFromId(
          { id: 'shouldNotHaveField', meta: { operation: node.name } },
          getNodeLocation(node)
        )
      );
    }

    // if there is only 1 mandatory arg, this is already handled by the wrongFirstArgument check
    if (mandatoryArguments.length > 1 && node.args.length < mandatoryArguments.length) {
      const missingArgs = mandatoryArguments.filter((_, i) => node.args[i] == null);
      const [missingArgsWithAlternatives, missingArgsWithoutAlternative] = partition(
        missingArgs,
        (
          v
        ): v is {
          name: string;
          alternativeWhenMissing: string;
        } => v.alternativeWhenMissing != null
      );

      if (missingArgsWithoutAlternative.length) {
        errors.push(
          getMessageFromId(
            {
              id: 'missingMathArgument',
              meta: {
                operation: node.name,
                count: mandatoryArguments.length - node.args.length,
                params: missingArgsWithoutAlternative.map(({ name }) => name).join(', '),
              },
            },
            getNodeLocation(node)
          )
        );
      }
      if (missingArgsWithAlternatives.length) {
        // pick only the first missing argument alternative
        const [firstArg] = missingArgsWithAlternatives;
        errors.push(
          getMessageFromId(
            {
              id: 'useAlternativeFunction',
              meta: {
                operation: node.name,
                params: firstArg.name,
                alternativeFn: firstArg.alternativeWhenMissing,
              },
            },
            getNodeLocation(node)
          )
        );
      }
    }
    const wrongTypeArgumentIndexes = positionalArguments
      .map(({ type }, index) => {
        const arg = node.args[index];
        if (arg != null) {
          const argType = getArgumentType(arg, operations);
          if (argType && argType !== type) {
            return index;
          }
        }
      })
      .filter(nonNullable);
    for (const wrongTypeArgumentIndex of wrongTypeArgumentIndexes) {
      const arg = node.args[wrongTypeArgumentIndex];
      errors.push(
        getMessageFromId(
          {
            id: 'wrongTypeArgument',
            meta: {
              operation: node.name,
              name: positionalArguments[wrongTypeArgumentIndex].name,
              type: getArgumentType(arg, operations) || DEFAULT_RETURN_TYPE,
              expectedType: positionalArguments[wrongTypeArgumentIndex].type || '',
            },
          },
          getNodeLocation(node)
        )
      );
    }
  });
  return errors;
}

function validateFieldArguments(
  node: TinymathFunction,
  variables: Array<string | number | TinymathVariable>,
  {
    isFieldOperation,
    firstArg,
    returnedType,
  }: {
    isFieldOperation: boolean;
    firstArg: TinymathAST;
    returnedType: 'ratio' | 'ordinal' | 'interval' | undefined;
  }
) {
  const fields = variables.filter(
    (arg) => isArgumentValidType(arg, 'variable') && !isMathNode(arg)
  );
  const errors = [];
  if (isFieldOperation && (fields.length > 1 || (fields.length === 1 && fields[0] !== firstArg))) {
    errors.push(
      getMessageFromId(
        {
          id: 'tooManyFirstArguments',
          meta: {
            operation: node.name,
            type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
              defaultMessage: 'field',
            }),
            supported: 1,
            text: (fields as TinymathVariable[]).map(({ text }) => text).join(', '),
          },
        },
        getNodeLocation(node)
      )
    );
  }
  if (isFieldOperation && fields.length === 1 && fields[0] === firstArg) {
    if (returnedType === 'ordinal') {
      errors.push(
        getMessageFromId(
          {
            id: 'wrongReturnedType',
            meta: {
              text: node.text ?? `${node.name}(${getValueOrName(firstArg)})`,
            },
          },
          getNodeLocation(node)
        )
      );
    }
  }
  if (!isFieldOperation && fields.length) {
    errors.push(
      getMessageFromId(
        {
          id: 'wrongArgument',
          meta: {
            operation: node.name,
            text: (fields as TinymathVariable[]).map(({ text }) => text).join(', '),
            type: i18n.translate('xpack.lens.indexPattern.formulaFieldValue', {
              defaultMessage: 'field',
            }),
          },
        },
        getNodeLocation(node)
      )
    );
  }
  return errors;
}

function validateFunctionArguments(
  node: TinymathFunction,
  functions: TinymathFunction[],
  requiredFunctions: number = 0,
  {
    isFieldOperation,
    firstArgValidation,
    type,
  }: { isFieldOperation: boolean; firstArgValidation: boolean; type: string }
) {
  const errors = [];
  // For math operation let the native operation run its own validation
  const [esOperations, mathOperations] = partition(functions, (arg) => !isMathNode(arg));
  if (esOperations.length > requiredFunctions) {
    if (isFieldOperation) {
      errors.push(
        getMessageFromId(
          {
            id: 'wrongArgument',
            meta: {
              operation: node.name,
              text: (esOperations as TinymathFunction[]).map(({ text }) => text).join(', '),
              type: i18n.translate('xpack.lens.indexPattern.formulaMetricValue', {
                defaultMessage: 'metric',
              }),
            },
          },
          getNodeLocation(node)
        )
      );
    } else {
      errors.push(
        getMessageFromId(
          {
            id: 'tooManyFirstArguments',
            meta: {
              operation: node.name,
              type,
              supported: requiredFunctions,
              text: (esOperations as TinymathFunction[]).map(({ text }) => text).join(', '),
            },
          },
          getNodeLocation(node)
        )
      );
    }
  }
  // full reference operation have another way to handle math operations
  if (
    isFieldOperation &&
    ((!firstArgValidation && mathOperations.length) || mathOperations.length > 1)
  ) {
    errors.push(
      getMessageFromId(
        {
          id: 'wrongArgument',
          meta: {
            operation: node.name,
            type,
            text: (mathOperations as TinymathFunction[]).map(({ text }) => text).join(', '),
          },
        },
        getNodeLocation(node)
      )
    );
  }
  return errors;
}
