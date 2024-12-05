/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TinymathAST } from '@kbn/tinymath';
import { OperationDefinition } from '..';
import { ValueFormatConfig, ReferenceBasedIndexPatternColumn } from '../column_types';
import { IndexPattern } from '../../../../../types';

export interface MathIndexPatternColumn extends ReferenceBasedIndexPatternColumn {
  operationType: 'math';
  params: {
    tinymathAst: TinymathAST | string;
    // last value on numeric fields can be formatted
    format?: ValueFormatConfig;
  };
}

export const mathOperation: OperationDefinition<MathIndexPatternColumn, 'managedReference'> = {
  type: 'math',
  displayName: 'Math',
  hidden: true,
  getDefaultLabel: (column, columns, indexPattern) => 'Math',
  input: 'managedReference',
  getDisabledStatus(indexPattern: IndexPattern) {
    return undefined;
  },
  getPossibleOperation() {
    return {
      dataType: 'number',
      isBucketed: false,
      scale: 'ratio',
    };
  },
  toExpression: (layer, columnId) => {
    const column = layer.columns[columnId] as MathIndexPatternColumn;
    return [
      {
        type: 'function',
        function: 'mathColumn',
        arguments: {
          id: [columnId],
          name: [column.label],
          expression: [astToString(column.params.tinymathAst)],
          onError: ['null'],
          // cast everything into number
          castColumns: column.references,
        },
      },
    ];
  },
  buildColumn() {
    return {
      label: 'Math',
      dataType: 'number',
      operationType: 'math',
      isBucketed: false,
      scale: 'ratio',
      params: {
        tinymathAst: '',
      },
      references: [],
    };
  },
  isTransferable: (column, newIndexPattern) => {
    // TODO has to check all children
    return true;
  },
  createCopy: (layers) => {
    return { ...layers };
  },
};

const optimizableFnsMap: Record<string, string> = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
  lt: '<',
  gt: '>',
  eq: '==',
  lte: '<=',
  gte: '>=',
};

function astToString(ast: TinymathAST | string): string | number {
  if (typeof ast === 'number') {
    return ast;
  }
  if (typeof ast === 'string') {
    // Double quotes around uuids like 1234-5678X2 to avoid ambiguity
    return `"${ast}"`;
  }
  if (ast.type === 'variable') {
    return ast.value;
  }
  if (ast.type === 'namedArgument') {
    if (ast.name === 'kql' || ast.name === 'lucene') {
      return `${ast.name}='${ast.value}'`;
    }
    return `${ast.name}=${ast.value}`;
  }
  if (optimizableFnsMap[ast.name]) {
    // make sure to preserve the right grouping here adding explicit brackets
    return `(${ast.args.map(astToString).join(` ${optimizableFnsMap[ast.name]} `)})`;
  }
  return `${getUnprefixedName(ast.name)}(${ast.args.map(astToString).join(',')})`;
}

// Some function names have ES overlaps, hence a prefix has been added
// for the tinymath version. This list of prefixes will be used to cleanup
// the function name before passing it over to the tinymath expression
const renamePrefixToRemove = ['pick_'];

function getUnprefixedName(name: string) {
  return renamePrefixToRemove.reduce(
    (newName, wrapperPrefix) => newName.replace(wrapperPrefix, ''),
    name
  );
}
