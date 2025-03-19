/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { groupBy, isObject } from 'lodash';
import type {
  TinymathAST,
  TinymathFunction,
  TinymathNamedArgument,
  TinymathVariable,
} from '@kbn/tinymath';
import type { Query } from '@kbn/es-query';
import { tinymathFunctions } from '@kbn/lens-formula-docs';
import { nonNullable } from '../../../../../utils';
import type {
  OperationDefinition,
  GenericIndexPatternColumn,
  GenericOperationDefinition,
} from '..';
import type { GroupedNodes } from './types';

export const unquotedStringRegex = /[^0-9A-Za-z._@\[\]/]/;

export function groupArgsByType(args: TinymathAST[]) {
  const {
    namedArgument,
    variable,
    function: functions,
  } = groupBy<TinymathAST>(args, (arg: TinymathAST) => {
    return isObject(arg) ? arg.type : 'variable';
  }) as GroupedNodes;
  // better naming
  return {
    namedArguments: namedArgument || [],
    variables: variable || [],
    functions: functions || [],
  };
}

export function getValueOrName(node: TinymathAST) {
  if (!isObject(node)) {
    return node;
  }
  if (node.type !== 'function') {
    return node.value;
  }
  return node.name;
}

export function mergeWithGlobalFilters(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  mappedParams: Record<string, string | number>,
  globalFilter?: Query,
  globalReducedTimeRange?: string
) {
  if (globalFilter && operation.filterable) {
    const languageKey = 'kql' in mappedParams ? 'kql' : 'lucene';
    if (mappedParams[languageKey]) {
      // ignore the initial empty string case
      if (globalFilter.query) {
        mappedParams[languageKey] = `(${globalFilter.query}) AND (${mappedParams[languageKey]})`;
      }
    } else {
      const language = globalFilter.language === 'kuery' ? 'kql' : globalFilter.language;
      mappedParams[language] = globalFilter.query as string;
    }
  }
  // Local definition override the global one
  if (globalReducedTimeRange && operation.canReduceTimeRange && !mappedParams.reducedTimeRange) {
    mappedParams.reducedTimeRange = globalReducedTimeRange;
  }
  return mappedParams;
}

export function getOperationParams(
  operation:
    | OperationDefinition<GenericIndexPatternColumn, 'field'>
    | OperationDefinition<GenericIndexPatternColumn, 'fullReference'>,
  params: TinymathNamedArgument[] = []
): Record<string, string | number> {
  const formalArgs: Record<string, string> = (operation.operationParams || []).reduce(
    (memo: Record<string, string>, { name, type }) => {
      memo[name] = type;
      return memo;
    },
    {}
  );

  return params.reduce<Record<string, string | number>>((args, { name, value }) => {
    if (formalArgs[name]) {
      args[name] = value;
    }
    if (operation.filterable && (name === 'kql' || name === 'lucene')) {
      args[name] = value;
    }
    if (operation.shiftable && name === 'shift') {
      args[name] = value;
    }
    if (operation.canReduceTimeRange && name === 'reducedTimeRange') {
      args.reducedTimeRange = value;
    }
    return args;
  }, {});
}

export function isMathNode(node: TinymathAST | string) {
  return isObject(node) && node.type === 'function' && tinymathFunctions[node.name];
}

export function findMathNodes(root: TinymathAST | string): TinymathFunction[] {
  function flattenMathNodes(node: TinymathAST | string): TinymathFunction[] {
    if (!isObject(node) || node.type !== 'function' || !isMathNode(node)) {
      return [];
    }
    return [node, ...node.args.flatMap(flattenMathNodes)].filter(nonNullable);
  }

  return flattenMathNodes(root);
}

// traverse a tree and find all string leaves
export function findVariables(node: TinymathAST | string): TinymathVariable[] {
  if (typeof node === 'string') {
    return [
      {
        type: 'variable',
        value: node,
        text: node,
        location: { min: 0, max: 0 },
      },
    ];
  }
  if (node == null) {
    return [];
  }
  if (typeof node === 'number' || node.type === 'namedArgument') {
    return [];
  }
  if (node.type === 'variable') {
    // leaf node
    return [node];
  }
  return node.args.flatMap(findVariables);
}

export function filterByVisibleOperation(
  operationDefinitionMap: Record<string, GenericOperationDefinition>
) {
  return Object.fromEntries(
    Object.entries(operationDefinitionMap).filter(([, operation]) => !operation.hidden)
  );
}
