/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'react';
import { produce } from 'immer';
import { ExpressionFunctionAST } from '@kbn/interpreter/target/common';
import {
  InterpreterResult,
  InterpreterError,
} from '../../../../../../../../../../src/plugins/expressions/public';

import { createActionFactory } from '../../lib/actions';

interface Ast {
  type: 'expression' | 'error' | 'null';
  chain: ExpressionFunctionAST[];
}

export enum ExpressionsActions {
  SET_EXPRESSION = 'SET_EXPRESSION',
  SET_AST = 'SET_AST',
  SET_DEBUG = 'SET_DEBUG',
  SET_RESULT = 'SET_RESULT',
}

export type ExpressionsAction = ReturnType<typeof actions[keyof typeof actions]>;

export interface Store {
  expression: string;
  ast: Ast | null;
  debug: InterpreterResult | InterpreterError | null;
  result: Ast | null;
}

const createAction = createActionFactory<ExpressionsActions>();

export const setExpression = (expression: string) =>
  createAction(ExpressionsActions.SET_EXPRESSION, { expression });

export const setExpressionAst = (ast: Ast | null) =>
  createAction(ExpressionsActions.SET_AST, { ast });

export const setExpressionDebug = (debug: InterpreterResult | InterpreterError | null) =>
  createAction(ExpressionsActions.SET_DEBUG, { debug });

export const setExpressionResult = (result: Ast | null) =>
  createAction(ExpressionsActions.SET_RESULT, { result });

const actions = {
  setExpression,
  setExpressionAst,
  setExpressionDebug,
  setExpressionResult,
};

export const initialState: Store = {
  expression: '',
  ast: null,
  debug: null,
  result: null,
};

export const reducer: Reducer<Store, ExpressionsAction> = (state, action) =>
  produce<Store>(state, draft => {
    switch (action.type) {
      case ExpressionsActions.SET_EXPRESSION: {
        const { expression } = action.payload;
        draft.expression = expression;
        return;
      }

      case ExpressionsActions.SET_AST: {
        const { ast } = action.payload;
        draft.ast = ast;
        return;
      }

      case ExpressionsActions.SET_DEBUG: {
        const { debug } = action.payload;
        draft.debug = debug;
        return;
      }

      case ExpressionsActions.SET_RESULT: {
        const { result } = action.payload;

        if (!result || result.type === 'error' || result.type === 'null') {
          draft.result = null;
          return;
        }

        draft.result = result;
        return;
      }
    }
  });
